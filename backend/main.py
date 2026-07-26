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

from services import PDFDocumentAssistant

# Initiera FastAPI-applikationen
app = FastAPI()

# =====================================================================
# CORS-INSTÄLLNINGAR
# ---------------------------------------------------------------------
# Tillåter att din React-frontend (som körs på port 5173) kan kommunicera
# med denna backend-server utan säkerhetsspärrar.
# ANPASSNING: Ändra 'allow_origins' om klienten flyttas till en annan URL/port.
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# INITIERING AV ASSISTENTEN
# ---------------------------------------------------------------------
# Skapar en global instans av vår logikklass (PDFDocumentAssistant).
# ANPASSNING:
# - 'ollama_host': Ändra IP-adress/port till din Ollama-server.
# - 'model_name': Byt till den LLM du vill använda (t.ex. gemma4:e4b).
# - 'embedding_model': Byt till den embeddingsmodell du föredrar.
# =====================================================================
assistant = PDFDocumentAssistant(
    upload_dir="uploads",
    vector_db_dir="./chroma_db",
    ollama_host="http://100.71.88.71:11434",
    model_name="gemma4:e4b",      # <-- ANPASSNING: Byt modellnamn här vid behov!
    embedding_model="bge-m3"     # <-- ANPASSNING: Byt embeddingsmodell här vid behov!
)


# Pydantic-modell för inkommande frågor från klienten
class QueryRequest(BaseModel):
    question: str


# =====================================================================
# ENDPOINT: UPPPLADDNING AV PDF (/upload)
# ---------------------------------------------------------------------
# Tar emot en fil från frontend, validerar att det är en PDF, rensar
# tidigare minne/databaser, sparar filen lokalt och startar RAG-processen.
# =====================================================================
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Validera filändelse
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Endast PDF-filer tillåts.")

    try:
        # Rnsa tidigare konversation och vektordatabas inför ny uppladdning
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
# ---------------------------------------------------------------------
# Tar emot en fråga från klienten, verifierar att ett dokument finns
# inläst, och skickar frågan vidare till RAG-motorn för att generera svar.
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