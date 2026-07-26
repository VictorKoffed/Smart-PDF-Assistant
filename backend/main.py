# =====================================================================
# FASTAPI BACKEND - HUVUDPROGRAM (main.py)
# ---------------------------------------------------------------------
# Denna fil ansvarar för API-applikationen och dess endpoints.
# Den tar emot anrop från React-frontend, hanterar användarsessioner
# och skickar data vidare till logikklassen i 'services.py'.
#
# ANVISNING FÖR ATT STARTA SERVERN:
# Kör följande kommando i terminalen: uvicorn main:app --reload
# =====================================================================

import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# =====================================================================
# MILJÖVARIABLER & KONFIGURATION
# ---------------------------------------------------------------------
# Laddar inställningar från en .env-fil för att systemet enkelt
# ska kunna driftas i olika miljöer (lokalt, utveckling, produktion)
# utan att hårdkoda IP-adresser eller portar i källkoden.
# =====================================================================
load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma4:e4b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "bge-m3")

from services import PDFDocumentAssistant

# Initiera FastAPI-applikationen
app = FastAPI()

# =====================================================================
# CORS-INSTÄLLNINGAR
# ---------------------------------------------------------------------
# Tillåter att React-klienten kan kommunicera med denna backend-server.
# Konfigurationen tillåter alla headers, vilket är nödvändigt för att
# ta emot anpassade headers som X-Session-ID.
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# SESSIONSHANTERING
# ---------------------------------------------------------------------
# För att stödja flera samtidiga användare lagras en unik instans av
# assistenten per session. Detta förhindrar att användare skriver över
# varandras uppladdade filer eller chatthistorik (vektordatabas).
# =====================================================================
active_sessions = {}


def get_assistant(session_id: str):
    """
    Hämtar en existerande assistent för given session, eller skapar en ny
    om det är användarens första anrop.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="Session-ID saknas.")

    if session_id not in active_sessions:
        # Skapar unika mappar för just denna session för att isolera datan
        session_upload_dir = f"uploads/{session_id}"
        session_db_dir = f"./chroma_db/{session_id}"

        active_sessions[session_id] = PDFDocumentAssistant(
            upload_dir=session_upload_dir,
            vector_db_dir=session_db_dir,
            ollama_host=OLLAMA_HOST,
            model_name=LLM_MODEL,
            embedding_model=EMBEDDING_MODEL
        )
    return active_sessions[session_id]


# Pydantic-modell för inkommande frågor från klienten
class QueryRequest(BaseModel):
    question: str


# =====================================================================
# ENDPOINT: UPPPLADDNING AV PDF (/upload)
# ---------------------------------------------------------------------
# Tar emot en fil från frontend, validerar formatet, identifierar
# användarens session, sparar filen lokalt och startar RAG-processen.
# =====================================================================
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), x_session_id: str = Header(None)):
    # Validera filändelse
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Endast PDF-filer tillåts.")

    # Hämta eller skapa assistenten för denna specifika användare
    assistant = get_assistant(x_session_id)

    try:
        # Rensa tidigare konversation/databas för denna specifika session
        assistant.clear_memory()

        # Säkerställ att den sessionsspecifika mappen existerar innan vi sparar
        os.makedirs(assistant.upload_dir, exist_ok=True)

        file_path = os.path.join(assistant.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Skicka filen vidare för uppdelning och indexering i vektordatabasen
        assistant.process_pdf(file_path)
        return {"message": f"Filen {file.filename} har bearbetats för sessionen!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# ENDPOINT: STÄLLA FRÅGOR (/ask)
# ---------------------------------------------------------------------
# Tar emot en fråga, kopplar den till rätt användares session och
# skickar frågan till RAG-motorn för att generera ett kontextuellt svar.
# =====================================================================
@app.post("/ask")
def ask_question(payload: QueryRequest, x_session_id: str = Header(None)):
    # Hämta rätt assistent baserat på inkommande session
    assistant = get_assistant(x_session_id)

    # Säkerhetskontroll: Stoppa anropet om ingen PDF har laddats upp för sessionen
    if not hasattr(assistant, "vectorstore") or assistant.vectorstore is None:
        raise HTTPException(status_code=400, detail="Ingen PDF har laddats upp ännu för denna session.")

    try:
        # Utför RAG-sökning och generera svar
        result = assistant.query_rag(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))