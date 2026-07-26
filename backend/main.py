# =====================================================================
# FASTAPI BACKEND - HUVUDPROGRAM (main.py)
# ---------------------------------------------------------------------
# Denna fil ansvarar för API-applikationen och dess endpoints.
# Den tar emot anrop från React-frontend och skickar dem vidare till
# logikklassen i 'services.py'.
#
# ANVISNING FÖR ATT STARTA SERVERN:
# Kör följande kommando i terminalen: uvicorn main:app --reload
# =====================================================================

import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv  # <-- LÄGG TILL DETTA FÖR MILJÖVARIABLER

from services import PDFDocumentAssistant

# Ladda in variabler från .env-filen (om den finns)
load_dotenv()

# Hämta miljövariabler eller använd fallback-värden
OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://100.71.88.71:11434")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma4:e4b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "bge-m3")

# Initiera FastAPI-applikationen
app = FastAPI()

# =====================================================================
# CORS-INSTÄLLNINGAR
# ---------------------------------------------------------------------
# Tillåter att din React-frontend kan kommunicera med servern.
# Nu hämtas den tillåtna adressen dynamiskt via .env.
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], # <-- ANVÄNDER VARIABELN HÄR
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# INITIERING AV ASSISTENTEN
# ---------------------------------------------------------------------
# Skapar en global instans av vår logikklass (PDFDocumentAssistant).
# Värdena styrs nu via .env-filen för smidigare drift i olika miljöer.
# =====================================================================
assistant = PDFDocumentAssistant(
    upload_dir="uploads",
    vector_db_dir="./chroma_db",
    ollama_host=OLLAMA_HOST,          # <-- ANVÄNDER VARIABELN HÄR
    model_name=LLM_MODEL,             # <-- ANVÄNDER VARIABELN HÄR
    embedding_model=EMBEDDING_MODEL   # <-- ANVÄNDER VARIABELN HÄR
)


# Pydantic-modell för inkommande frågor från klienten
class QueryRequest(BaseModel):
    question: str


# =====================================================================
# ENDPOINT: UPPPLADDNING AV PDF (/upload)
# =====================================================================
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Validera filändelse
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Endast PDF-filer tillåts.")

    try:
        # Rensa tidigare konversation och vektordatabas inför ny uppladdning
        assistant.clear_memory()

        # Spara ner filen i den angivna uppladdningsmappen
        file_path = os.path.join(assistant.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Skicka filen vidare för uppdelning och indexering i vektordatabasen
        assistant.process_pdf(file_path)
        return {"message": f"Filen {file.filename} har bearbetats och tidigare minne är raderat!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# ENDPOINT: STÄLLA FRÅGOR (/ask)
# =====================================================================
@app.post("/ask")
def ask_question(payload: QueryRequest):
    # Säkerhetskontroll: Stoppa anropet om ingen PDF har laddats upp än
    if not hasattr(assistant, "vectorstore") or assistant.vectorstore is None:
        raise HTTPException(status_code=400, detail="Ingen PDF har laddats upp ännu.")

    try:
        # Utför RAG-sökning och generera svar via assistenten
        result = assistant.query_rag(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))