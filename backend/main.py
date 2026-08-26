# =====================================================================
# FASTAPI BACKEND - MAIN PROGRAM (main.py)
# ---------------------------------------------------------------------
# This module defines the API application and its endpoints.
# It receives requests from the React frontend, manages user sessions,
# and delegates document-processing and RAG operations to PDFDocumentAssistant.
#
# SERVER STARTUP:
# Run the following command in the terminal: uvicorn main:app --reload
# =====================================================================

import os
import time
import uuid
import shutil
import asyncio
import re
from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# =====================================================================
# ENVIRONMENT VARIABLES & CONFIGURATION
# ---------------------------------------------------------------------
# Load configuration from a .env file so the application can be deployed
# across different environments without hardcoding infrastructure-specific
# addresses, ports, or AI service configuration into the source code.
# =====================================================================
load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma4:e4b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "bge-m3")

from services import PDFDocumentAssistant

# Initialize the FastAPI application.
app = FastAPI()

# =====================================================================
# CORS CONFIGURATION
# ---------------------------------------------------------------------
# Allows the React client to communicate with the FastAPI backend.
# The current permissive configuration is suitable for development,
# while a production deployment should restrict origins to trusted clients.
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development.
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods used by the API.
    allow_headers=["*"],  # Allow custom headers such as X-Session-ID.
)

# =====================================================================
# SESSION MANAGEMENT
# ---------------------------------------------------------------------
# Each active session owns a separate assistant instance and therefore
# separate upload and vector-database directories. This keeps document
# data and conversation state isolated between concurrent users.
# =====================================================================
active_sessions = {}


def cleanup_old_sessions():
    """
    Remove inactive sessions and their associated on-disk data after
    24 hours of inactivity.

    Session-specific files and vector indexes are temporary application
    state, so expired sessions can be safely removed to prevent unbounded
    disk usage over time.
    """
    now = time.time()
    expired_sessions = [
        s_id
        for s_id, s_data in active_sessions.items()
        if now - s_data["last_active"] > 86400
    ]

    for s_id in expired_sessions:
        session_data = active_sessions.pop(s_id, None)
        if session_data:
            assistant = session_data["assistant"]
            shutil.rmtree(assistant.upload_dir, ignore_errors=True)
            shutil.rmtree(assistant.vector_db_dir, ignore_errors=True)


def get_assistant(session_id: str):
    """
    Return the assistant associated with the specified session, creating
    a new isolated assistant instance when the session is accessed for
    the first time.

    The session identifier is validated before it is used to construct
    filesystem paths, preventing user-controlled path components from
    escaping the intended session directories.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="Session-ID saknas.")

    # =================================================================
    # SECURITY: SESSION ID VALIDATION
    # -----------------------------------------------------------------
    # Only alphanumeric characters and hyphens are accepted because the
    # session ID becomes part of filesystem paths. Restricting its format
    # prevents path traversal attempts such as "../" from reaching the
    # filesystem layer.
    # =================================================================
    if not re.match(r"^[a-zA-Z0-9-]+$", session_id):
        raise HTTPException(status_code=400, detail="Ogiltigt format på Session-ID.")

    cleanup_old_sessions()

    if session_id not in active_sessions:
        # Create session-specific storage locations to isolate each user's
        # uploaded documents and vector index from other sessions.
        session_upload_dir = f"uploads/{session_id}"
        session_db_dir = f"./chroma_db/{session_id}"

        assistant_obj = PDFDocumentAssistant(
            upload_dir=session_upload_dir,
            vector_db_dir=session_db_dir,
            ollama_host=OLLAMA_HOST,
            model_name=LLM_MODEL,
            embedding_model=EMBEDDING_MODEL
        )
        active_sessions[session_id] = {
            "assistant": assistant_obj,
            "last_active": time.time()
        }
    else:
        active_sessions[session_id]["last_active"] = time.time()

    return active_sessions[session_id]["assistant"]


# Pydantic model representing questions submitted by the client.
class QueryRequest(BaseModel):
    """Represent a user question received from the frontend."""
    question: str


# =====================================================================
# ENDPOINT: PDF UPLOAD (/upload)
# ---------------------------------------------------------------------
# Receives a PDF from the frontend, validates its format, resolves the
# user's session, stores the document locally, and starts the RAG
# ingestion pipeline that extracts, chunks, embeds, and indexes its text.
# =====================================================================
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), x_session_id: str = Header(None)):
    # Validate the uploaded file type before it enters the document pipeline.
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Endast PDF-filer tillåts.")

    # Resolve the assistant belonging to this specific session.
    assistant = get_assistant(x_session_id)

    try:
        # Start with a clean conversation and document index when a new PDF
        # is uploaded so previous document context cannot affect later queries.
        assistant.clear_memory()

        # Ensure the session-specific storage directory exists before writing
        # the uploaded document to disk.
        os.makedirs(assistant.upload_dir, exist_ok=True)

        # Generate an unpredictable, unique filename instead of trusting the
        # user-provided filename when constructing the physical file path.
        safe_filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(assistant.upload_dir, safe_filename)

        # Stream the uploaded content directly to disk instead of loading the
        # entire PDF into memory, which keeps memory usage predictable for
        # potentially large documents.
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run the document ingestion pipeline in a worker thread because PDF
        # extraction, chunking, embedding, and indexing are blocking operations.
        # This keeps the asynchronous FastAPI event loop responsive to clients.
        await asyncio.to_thread(assistant.process_pdf, file_path)

        # Return the original filename only as presentation data so the frontend
        # can display a meaningful name without using it as a filesystem path.
        return {"message": f"Filen {file.filename} har bearbetats för sessionen!"}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
# ENDPOINT: ASK QUESTION (/ask)
# ---------------------------------------------------------------------
# Receives a question, resolves it against the correct user session,
# and delegates retrieval and response generation to the RAG pipeline.
# The generated answer is streamed back to the React client using SSE
# so the interface can display the response while it is being generated.
# =====================================================================
@app.post("/ask")
def ask_question(payload: QueryRequest, x_session_id: str = Header(None)):
    # Resolve the assistant belonging to the incoming session.
    assistant = get_assistant(x_session_id)

    # Prevent queries from reaching the RAG pipeline before a document has
    # been indexed for this session.
    if not hasattr(assistant, "vectorstore") or assistant.vectorstore is None:
        raise HTTPException(status_code=400, detail="Ingen PDF har laddats upp ännu för denna session.")

    try:
        # Stream the RAG response through Server-Sent Events so generated
        # content can reach the frontend incrementally instead of waiting
        # for the complete language-model response.
        return StreamingResponse(
            assistant.stream_query_rag(payload.question),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
