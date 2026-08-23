# =====================================================================
# TESTFIL FÖR BACKEND (test_main.py)
# ---------------------------------------------------------------------
# Denna fil innehåller enhetstester för att säkerställa att både
# FastAPI-endpoints (main.py) och logiken i serviceklassen (services.py)
# fungerar som förväntat utan att krascha.
#
# ANVISNING FÖR ATT KÖRA TESTER:
# Kör följande kommando i terminalen: pytest
# =====================================================================

import io
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, get_assistant, LLM_MODEL

# Skapar en testklient som simulerar HTTP-anrop direkt mot applikationen
client = TestClient(app)

# =====================================================================
# TEST-SESSION
# Eftersom systemet kräver unika sessioner, definierar vi ett
# statiskt session-id som vi använder genomgående i alla tester.
# =====================================================================
TEST_SESSION_ID = "test-session-12345"


# ==========================================
# 1. TESTER FÖR API-ENDPOINTS (main.py)
# ==========================================

def test_upload_invalid_file_type():
    """
    Testar att servern sätter stopp (400 Bad Request) om man
    försöker ladda upp en fil som inte är en PDF.
    """
    file_content = "detta är en textfil".encode("utf-8")
    response = client.post(
        "/upload",
        files={"file": ("test.txt", file_content, "text/plain")},
        headers={"X-Session-ID": TEST_SESSION_ID}  # <- Måste nu skickas med!
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Endast PDF-filer tillåts."


def test_upload_valid_pdf_success():
    """
    Testar att en giltig PDF-uppladdning går igenom hela flödet med status 200 OK.
    Mockar bort tunga processer (som filskrivning och RAG-bearbetning) för snabba tester.
    """
    # Hämtar assistenten för just vår test-session
    test_assistant = get_assistant(TEST_SESSION_ID)

    with patch.object(test_assistant, "process_pdf"), patch.object(test_assistant, "clear_memory"):
        # Skapar en enkel binär sträng som simulerar en PDF-fil i minnet
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
    Testar att om process_pdf kastar ett RuntimeError (t.ex. vid skannad eller tom PDF),
    så svarar /upload endpointen med 400 Bad Request och felmeddelandet.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    with patch.object(test_assistant, "process_pdf", side_effect=RuntimeError("PDF-filen saknar läsbar text eller verkar vara en skannad bild.")), patch.object(test_assistant, "clear_memory"):
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
    Testar att /ask endpointen stoppar förfrågningar (returnerar felkod)
    om ingen vektordatabas/dokument finns tillgängligt än.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    # Nollställ vectorstore för att simulera att inget dokument är uppladdat
    test_assistant.vectorstore = None

    response = client.post(
        "/ask",
        json={"question": "Vad handlar dokumentet om?"},
        headers={"X-Session-ID": TEST_SESSION_ID}
    )

    # Verifierar att systemet sätter stopp med 400 Bad Request
    assert response.status_code == 400


def test_ask_with_uploaded_document():
    """
    Testar att /ask endpointen returnerar rätt strömmande svarsstruktur
    när ett dokument faktiskt har laddats upp och behandlats.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    # Sätt en mockad vectorstore så spärren passeras
    test_assistant.vectorstore = MagicMock()

    with patch.object(test_assistant, "stream_query_rag", return_value=iter(["data: {\"type\": \"sources\", \"sources\": []}\n\n", "data: {\"type\": \"token\", \"content\": \"Testar svar\"}\n\n", "data: {\"type\": \"done\"}\n\n"])):
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
# 2. TESTER FÖR TJÄNSTKLASSEN (services.py)
# ==========================================

def test_assistant_initialization():
    """
    Validerar att assistenten laddar in rätt grundläggande konfigurationsvärden.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    assert test_assistant.model_name == LLM_MODEL

    # Uppladdningsmappen ska nu innehålla sessions-id:t
    assert test_assistant.upload_dir == f"uploads/{TEST_SESSION_ID}"
    assert isinstance(test_assistant.chat_history, list)
    assert test_assistant.conversation_summary == ""


def test_clear_memory():
    """
    Testar att konversationsminnet (chat_history och conversation_summary) töms korrekt
    när clear_memory-metoden anropas.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    test_assistant.chat_history.clear()  # Töm listan först
    test_assistant.chat_history.append(("Fråga", "Svar"))
    test_assistant.conversation_summary = "En tidigare sammanfattning"
    assert len(test_assistant.chat_history) == 1

    test_assistant.clear_memory()
    assert len(test_assistant.chat_history) == 0
    assert test_assistant.conversation_summary == ""


def test_summarize_memory():
    """
    Testar att _summarize_memory skapar en sammanfattning och behåller det sista meddelandeparet.
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
# 3. MOCKADE TESTER AV RAG-LOGIKEN
# ==========================================

def test_query_rag_mocked():
    """
    Testar query_rag-metoden isolerat utan att kräva en aktiv anslutning
    till en lokal Ollama-server eller en riktig hårddiskdatabas.
    """
    test_assistant = get_assistant(TEST_SESSION_ID)

    # Eftersom vi optimerat Chroma (vi återanvänder self.vectorstore),
    # mockar vi similarity_search direkt på vektordatabasen.
    test_assistant.vectorstore = MagicMock()

    # Skapa ett fiktivt dokument som databasen låtsas hitta
    mock_doc = MagicMock()
    mock_doc.page_content = "Victor Koffed studerar systemutveckling."
    mock_doc.metadata = {"page": 0}

    # Koppla dokumentet till sökfunktionen
    test_assistant.vectorstore.similarity_search.return_value = [mock_doc]

    # Mocka Ollama-klientens svarsgenerering
    test_assistant.ollama_client = MagicMock()
    test_assistant.ollama_client.generate.return_value = {"response": "Victor studerar systemutveckling."}

    result = test_assistant.query_rag("Vem är Victor?")

    assert result["answer"] == "Victor studerar systemutveckling."
    assert len(result["sources"]) == 1
    assert result["sources"][0]["page"] == "Sida 1"
