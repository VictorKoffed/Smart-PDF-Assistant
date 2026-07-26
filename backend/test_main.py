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
from main import app, assistant

# Skapar en testklient som simulerar HTTP-anrop direkt mot applikationen
client = TestClient(app)


# ==========================================
# 1. TESTER FÖR API-ENDPOINTS (main.py)
# ==========================================

def test_upload_invalid_file_type():
    """
    Testar att servern sätter stopp (400 Bad Request) om man
    försöker ladda upp en fil som inte är en PDF.
    """
    file_content = "detta är en textfil".encode("utf-8")
    response = client.post("/upload", files={"file": ("test.txt", file_content, "text/plain")})

    assert response.status_code == 400
    assert response.json()["detail"] == "Endast PDF-filer tillåts."


def test_upload_valid_pdf_success():
    """
    Testar att en giltig PDF-uppladdning går igenom hela flödet med status 200 OK.
    Mockar bort tunga processer (som filskrivning och RAG-bearbetning) för snabba tester.
    """
    with patch.object(assistant, "process_pdf"), patch.object(assistant, "clear_memory"):
        # Skapar en enkel binär sträng som simulerar en PDF-fil i minnet
        pdf_bytes = "%PDF-1.4 fejkad pdf-innehall...".encode("utf-8")
        response = client.post(
            "/upload",
            files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )

        assert response.status_code == 200
        assert "har bearbetats" in response.json()["message"]


def test_ask_without_uploaded_document():
    """
    Testar att /ask endpointen stoppar förfrågningar (returnerar felkod)
    om ingen vektordatabas/dokument finns tillgängligt än.
    """
    # Nollställ vectorstore för att simulera att inget dokument är uppladdat
    assistant.vectorstore = None

    response = client.post("/ask", json={"question": "Vad handlar dokumentet om?"})

    # Verifierar att systemet sätter stopp med 400 Bad Request eller 500
    assert response.status_code in [400, 500]


def test_ask_with_uploaded_document():
    """
    Testar att /ask endpointen returnerar rätt svarsstruktur
    när ett dokument faktiskt har laddats upp och behandlats.
    """
    # Sätt en mockad vectorstore så spärren passeras
    assistant.vectorstore = MagicMock()

    with patch.object(assistant, "query_rag", return_value={"answer": "Testar svar", "sources": []}):
        response = client.post("/ask", json={"question": "Vad handlar dokumentet om?"})

        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Testar svar"
        assert "sources" in data


# ==========================================
# 2. TESTER FÖR TJÄNSTKLASSEN (services.py)
# ==========================================

def test_assistant_initialization():
    """
    Validerar att assistenten laddar in rätt grundläggande konfigurationsvärden.
    ANPASSNING: Om du byter primär AI-modell i 'main.py', uppdatera
    förväntat värde här ("gemma4:e4b") så att det matchar.
    """
    assert assistant.model_name == "gemma4:e4b"  # <-- ANPASSNING: Ändra om du byter modell
    assert assistant.upload_dir == "uploads"
    assert isinstance(assistant.chat_history, list)


def test_clear_memory():
    """
    Testar att konversationsminnet (chat_history) töms korrekt
    när clear_memory-metoden anropas.
    """
    assistant.chat_history.clear()  # Töm listan först för att undvika att tidigare tester spökar
    assistant.chat_history.append(("Fråga", "Svar"))
    assert len(assistant.chat_history) == 1

    assistant.clear_memory()
    assert len(assistant.chat_history) == 0


# ==========================================
# 3. MOCKADE TESTER AV RAG-LOGIKEN
# ==========================================

@patch("services.Chroma")
def test_query_rag_mocked(mock_chroma_class):
    """
    Testar query_rag-metoden isolerat utan att kräva en aktiv anslutning
    till en lokal Ollama-server eller en riktig hårddiskdatabas.
    """
    # Skapa ett fiktivt dokument som databasen låtsas hitta
    mock_doc = MagicMock()
    mock_doc.page_content = "Victor Koffed studerar systemutveckling."
    mock_doc.metadata = {"page": 0}

    # Koppla dokumentet till sökfunktionen
    mock_vectorstore = mock_chroma_class.return_value
    mock_vectorstore.similarity_search.return_value = [mock_doc]

    # Mocka Ollama-klientens svarsgenerering
    assistant.ollama_client = MagicMock()
    assistant.ollama_client.generate.return_value = {"response": "Victor studerar systemutveckling."}

    result = assistant.query_rag("Vem är Victor?")

    assert result["answer"] == "Victor studerar systemutveckling."
    assert len(result["sources"]) == 1
    assert result["sources"][0]["page"] == "Sida 1"