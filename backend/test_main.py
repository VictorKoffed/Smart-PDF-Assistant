# =====================================================================
# BACKEND TEST SUITE (test_main.py)
# ---------------------------------------------------------------------
# This module contains unit tests that verify the FastAPI endpoints and
# the service-layer behavior work as intended without relying on external
# infrastructure such as a live Ollama instance or persistent vector store.
#
# TEST COMMAND:
# Run the following command in the terminal: pytest
# =====================================================================

import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, get_assistant, LLM_MODEL

# Create a test client that exercises the FastAPI application through
# its HTTP interface without requiring a separately running web server.
client = TestClient(app)

# =====================================================================
# TEST SESSION
# ---------------------------------------------------------------------
# The application requires a session identifier to isolate user-specific
# state. A deterministic identifier keeps the tests focused on behavior
# rather than introducing unnecessary variability between test cases.
# =====================================================================
TEST_SESSION_ID = "test-session-12345"


# ==========================================
# 1. API ENDPOINT TESTS (main.py)
# ==========================================

def test_upload_invalid_file_type():
    """
    Verify that the upload endpoint rejects non-PDF files with a
    400 Bad Request response before they enter the document pipeline.
    """
    file_content = "detta är en textfil".encode("utf-8")
    response = client.post(
        "/upload",
        files={"file": ("test.txt", file_content, "text/plain")},
        headers={"X-Session-ID": TEST_SESSION_ID}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Endast PDF-filer tillåts."


def test_upload_valid_pdf_success():
    """
    Verify that a valid PDF upload completes successfully through the
    endpoint while isolating the test from expensive file processing
    and RAG ingestion operations.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    with patch.object(test_assistant, "process_pdf"), patch.object(test_assistant, "clear_memory"):
        pdf_bytes = "%PDF-1.4 fejkad pdf-innehall...".encode("utf-8")
        response = client.post(
            "/upload",
            files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers={"X-Session-ID": TEST_SESSION_ID}
        )

        assert response.status_code == 200
        assert "har bearbetats" in response.json()["message"]


def test_upload_process_pdf_runtime_error():
    """
    Verify that a document-processing RuntimeError, such as one caused
    by an unreadable or scanned PDF, is translated by the API into a
    controlled 400 Bad Request response.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    with patch.object(test_assistant, "process_pdf", side_effect=RuntimeError(
            "PDF-filen saknar läsbar text eller verkar vara en skannad bild.")), patch.object(test_assistant,
                                                                                              "clear_memory"):
        pdf_bytes = "%PDF-1.4 tom pdf...".encode("utf-8")
        response = client.post(
            "/upload",
            files={"file": ("empty.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers={"X-Session-ID": TEST_SESSION_ID}
        )

        assert response.status_code == 400
        assert "saknar läsbar text" in response.json()["detail"]


def test_ask_without_uploaded_document():
    """
    Verify that the question endpoint refuses requests when the session
    has no indexed document available for RAG retrieval.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)
    test_assistant.vectorstore = None

    response = client.post(
        "/ask",
        json={"question": "Vad handlar dokumentet om?"},
        headers={"X-Session-ID": TEST_SESSION_ID}
    )

    assert response.status_code == 400


def test_ask_with_uploaded_document():
    """
    Verify that the question endpoint returns the expected SSE response
    structure when a document has already been indexed for the session.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)
    test_assistant.vectorstore = MagicMock()

    with patch.object(test_assistant, "stream_query_rag", return_value=iter(
            ["data: {\"type\": \"sources\", \"sources\": []}\n\n",
             "data: {\"type\": \"token\", \"content\": \"Testar svar\"}\n\n", "data: {\"type\": \"done\"}\n\n"])):
        response = client.post(
            "/ask",
            json={"question": "Vad handlar dokumentet om?"},
            headers={"X-Session-ID": TEST_SESSION_ID}
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        content = response.text
        assert "Testar svar" in content


# ==========================================
# 2. SERVICE CLASS TESTS (services.py)
# ==========================================

def test_assistant_initialization():
    """
    Verify that a session-specific assistant is initialized with the
    expected configuration and empty conversational state.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    assert test_assistant.model_name == LLM_MODEL
    assert test_assistant.upload_dir == f"uploads/{TEST_SESSION_ID}"
    assert isinstance(test_assistant.chat_history, list)
    assert test_assistant.conversation_summary == ""


def test_clear_memory():
    """
    Verify that clear_memory removes conversational state so a newly
    uploaded document starts without context from the previous document.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    test_assistant.chat_history.clear()
    test_assistant.chat_history.append(("Fråga", "Svar"))
    test_assistant.conversation_summary = "En tidigare sammanfattning"
    assert len(test_assistant.chat_history) == 1

    test_assistant.clear_memory()
    assert len(test_assistant.chat_history) == 0
    assert test_assistant.conversation_summary == ""


def test_summarize_memory():
    """
    Verify that conversation summarization replaces older raw history
    with a generated summary while retaining the most recent interaction
    for immediate conversational continuity.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)
    test_assistant.chat_history = [
        ("Fråga 1", "Svar 1"),
        ("Fråga 2", "Svar 2"),
        ("Fråga 3", "Svar 3")
    ]
    test_assistant.conversation_summary = "Tidigare sammanfattning."

    test_assistant.ollama_client = MagicMock()
    test_assistant.ollama_client.generate.return_value = {"response": "Ny sammanfattning."}

    test_assistant._summarize_memory()

    assert test_assistant.conversation_summary == "Ny sammanfattning."
    assert len(test_assistant.chat_history) == 1
    assert test_assistant.chat_history[0] == ("Fråga 3", "Svar 3")


# ==========================================
# 3. MOCKED RAG LOGIC TESTS
# ==========================================

def test_query_rag_mocked():
    """
    Verify the synchronous RAG pipeline in isolation by mocking both
    document retrieval and AI generation. This keeps the test deterministic
    and prevents dependencies on Ollama or a persistent vector database.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)
    test_assistant.vectorstore = MagicMock()

    mock_doc = MagicMock()
    mock_doc.page_content = "Victor Koffed studerar systemutveckling."
    mock_doc.metadata = {"page": 0}

    test_assistant.vectorstore.similarity_search.return_value = [mock_doc]
    test_assistant.ollama_client = MagicMock()
    test_assistant.ollama_client.generate.return_value = {"response": "Victor studerar systemutveckling."}

    result = test_assistant.query_rag("Vem är Victor?")

    assert result["answer"] == "Victor studerar systemutveckling."
    assert len(result["sources"]) == 1
    assert result["sources"][0]["page"] == "Sida 1"


# ==========================================
# 4. MODEL FAILURE TESTS (OLLAMA OFFLINE)
# ==========================================

def test_query_rag_ollama_failure():
    """
    Verify that an exception from the Ollama client is contained within
    the service boundary and exposed to callers as a RuntimeError rather
    than leaking the underlying infrastructure exception.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)
    test_assistant.vectorstore = MagicMock()

    test_assistant.ollama_client = MagicMock()
    test_assistant.ollama_client.generate.side_effect = Exception("Ollama offline")

    with pytest.raises(RuntimeError) as excinfo:
        test_assistant.query_rag("Testfråga")

    assert "Kunde inte kommunicera med AI-modellen" in str(excinfo.value)
