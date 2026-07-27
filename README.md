# 📄 Smart PDF-Assistent

En lokal AI-applikation för dokumentanalys (RAG - Retrieval-Augmented Generation) som låter dig ladda upp PDF-filer och ställa interaktiva frågor om deras innehåll. Systemet körs lokalt med hjälp av **Ollama**, **FastAPI** och **React**.

---

## 🚀 Funktioner
* **Lokal:** AI-bearbetning sker lokalt utan att data skickas till externa molntjänster.
* **RAG-flöde:** Delar upp PDF-dokument i hanterbara textbitar (chunks), skapar embeddings och sparar i en persistent vektordatabas (**ChromaDB**).
* **Sessionshantering:** Använder unika session-IDs (UUID) och in-memory dictionaries för att hantera flera samtidiga användare.
* **Filhantering:** Uppladdade filer döps om till kryptografiska UUIDs och skrivs till disk via optimerade streams (`shutil.copyfileobj`) för att förhindra "Path Traversal" och minnesläckor.
* **UX:** Gränssnitt inspirerat av moderna AI-plattformar med Markdown-stöd, automatisk scroll samt mjuka animeringar (t.ex. skräddarsydda "pop"-animationer och ljusgradienter när AI:n har färdigställt sitt svar).
* **Källhänvisningar:** Visar exakt vilka sidor och textstycken (chunks) som AI använt för att generera sitt svar, med möjlighet att expandera och läsa hela stycket.

---

## 📸 Skärmdumpar

### Uppladdningsvy
![Uppladdning](images/upload.png)

### Chattgränssnitt
![Chatt](images/chat.png)

### Källhänvisningar
![Källor](images/sources.png)

---

## 🛠️ Teknikstack
* **Backend:** Python, FastAPI, LangChain, ChromaDB, PyPDF
* **Frontend:** React, Vite, React Markdown
* **AI / LLM:** Ollama (t.ex. `gemma4:e4b`) samt embeddings-modell (`bge-m3`)

---

## ⚙️ Installation & Start

Följ dessa steg för att köra projektet lokalt på din maskin.

### Förutsättningar
* [Node.js](https://nodejs.org/) installerat (för frontend).
* [Python](https://www.python.org/) installerat (för backend).
* [Ollama](https://ollama.com/) installerat och igång med dina valda modeller.

---

### 1. Starta Backend (FastAPI)
1. Navigera till mappen `backend/` i terminalen.
2. Skapa och aktivera en virtuell miljö (rekommenderas):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate

    Installera alla beroenden:
    Bash

    pip install -r requirements.txt

    Konfigurera miljövariabler:
    Kopiera mallen .env.example och skapa en ny fil med namnet .env. Anpassa IP-adresser och modellnamn efter din lokala setup.

    Starta servern:
    Bash

    uvicorn main:app --reload

2. Starta Frontend (React)

    Öppna en ny terminal och navigera till mappen frontend/.

    Installera alla beroenden:
    Bash

    npm install

    Konfigurera miljövariabler:
    Kopiera mallen .env.example och skapa en ny fil med namnet .env. Kontrollera att API-URL:en matchar din backend (standard är http://127.0.0.1:8000).

    Starta klienten:
    Bash

    npm run dev

---

---

## 💻 Utvecklingsmiljö & Arkitektur
Systemet är designat för att vara flexibelt och kan köras på en och samma maskin, men är utvecklat med en **distribuerad arkitektur** där AI-motorn är separerad från backend och frontend.

**AI-server (Ollama i Docker):**
* **OS:** Ubuntu Server
* **Hårdvara:** Nvidia RTX 4060M (8GB VRAM), AMD Ryzen 7 8840HS, 32GB DDR5 5600MHz (CL40)
* **Roll:** Hanterar uteslutande RAG-embeddings och LLM-generering, vilket håller huvudapplikationen lättviktig.

**Utvecklingsmaskin (FastAPI & React):**
* **OS:** CachyOS (Linux)
* **Hårdvara:** AMD Radeon RX 9070 XT, AMD Ryzen 9 5900X, 32GB DDR4 3600MHz (CL14)
* **Verktyg:** PyCharm (Backend) & WebStorm (Frontend)
* **Roll:** Utveckling, klienthantering och API-routing.

Denna uppdelning visar hur applikationen  kan kommunicera med externa inferens-servrar över nätverket, vilket möjliggör skalning.

---
