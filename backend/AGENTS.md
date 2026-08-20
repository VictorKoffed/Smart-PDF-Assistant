# AGENTS.md för Smart PDF Backend

## Utvecklingsmiljö & Kommandon
- **Starta servern:** `uvicorn main:app --reload`
- **Kör tester:** `pytest` (Ligger i `test_main.py`)

## Arkitektur & Filer
- **`main.py`**: Hanterar enbart FastAPI-endpoints, middleware (CORS) och injicering av sessioner (`X-Session-ID`). Ingen tung AI-logik här.
- **`services.py`**: All kärnlogik för RAG. Hanterar PyPDFLoader, ChromaDB, embeddings och kommunikation med Ollama.
- **`test_main.py`**: Enhetstester med `TestClient`.

## Regler för kodgenerering
1. **Sessionsisolering:** Appen stödjer flera användare. All data, filuppladdningar och ChromaDB-instanser MÅSTE vara isolerade per `X-Session-ID`.
2. **Mocking i tester:** Om du (agenten) skriver nya tester för `test_main.py`, MÅSTE du mocka anropen till disk och Ollama. Testerna ska gå snabbt och inte kräva en levande databas.
3. **Typing:** Använd Python type hints (`List`, `Dict`, `str`, etc.) för alla nya funktioner.
4. **Felhantering:** Använd FastAPI:s `HTTPException` i `main.py` för att skicka tillbaka rena felmeddelanden till React-klienten om något går fel i `services.py`.
