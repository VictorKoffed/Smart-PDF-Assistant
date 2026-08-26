# AGENTS.md for Smart PDF Backend

## Development Environment & Commands
- **Start the server:** `uvicorn main:app --reload`
- **Run tests:** `pytest` (Located in `test_main.py`)

## Architecture & Files
- **`main.py`**: Handles only FastAPI endpoints, middleware (CORS), and session injection (`X-Session-ID`). No heavy AI logic belongs here.
- **`services.py`**: Contains all core RAG logic. Handles PyPDFLoader, ChromaDB, embeddings, and communication with Ollama.
- **`test_main.py`**: Unit tests using `TestClient`.

## Code Generation Rules
1. **Session isolation:** The application supports multiple users. All data, file uploads, and ChromaDB instances MUST be isolated per `X-Session-ID`.
2. **Mocking in tests:** If the agent writes new tests for `test_main.py`, calls to disk and Ollama MUST be mocked. Tests should run quickly and must not require a live database.
3. **Typing:** Use Python type hints (`List`, `Dict`, `str`, etc.) for all new functions.
4. **Error handling:** Use FastAPI's `HTTPException` in `main.py` to return clear error messages to the React client when something goes wrong in `services.py`.
