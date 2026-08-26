[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?logo=ollama)](https://ollama.com/)

# 📄 Smart PDF-Assistent

En lokal AI-applikation för dokumentanalys med **RAG (Retrieval-Augmented Generation)**. Applikationen låter användaren ladda upp PDF-filer och ställa frågor om innehållet. AI-bearbetningen körs lokalt inom den egna infrastrukturen med hjälp av
**Ollama**, medan backend och frontend hanterar dokument, sökningar och
användargränssnitt.

---

## 📑 Innehåll

- [Projektbakgrund](#-projektbakgrund)
- [Funktioner](#-funktioner)
- [Demo](#-demo)
- [Skärmdumpar](#-skärmdumpar)
- [Teknikstack](#️-teknikstack)
- [Arkitektur](#️-arkitektur)
- [RAG-flöde](#-rag-flöde)
- [Installation & Start](#️-installation--start)
- [Utvecklingsmiljö](#-utvecklingsmiljö)
- [Driftsättning med Docker & Portainer](#-driftsättning-med-docker--portainer)
- [Filhantering och sessionshantering](#-filhantering-och-sessionshantering)
- [Säkerhet & integritet](#-säkerhet--integritet)
- [Realtidskommunikation](#-realtidskommunikation)
- [Källhänvisningar](#-källhänvisningar)
- [Projektstruktur](#-projektstruktur)
- [Framtida utveckling](#-framtida-utveckling)
- [Begränsningar](#️-begränsningar)
- [License](#-license)
- [AI-assistans och kodgenerering](#-ai-assistans-och-kodgenerering)

---

## 🎯 Projektbakgrund

Detta projekt utvecklades på fritiden som ett eget tekniskt projekt med
fokus på lokal AI, RAG och fullstack-utveckling.

Syftet var att utforska hur moderna AI-komponenter kan kombineras med en
egen backend och frontend för att skapa en praktisk applikation för
dokumentanalys.

Projektet har framför allt fungerat som ett sätt att fördjupa kunskaper inom:

- RAG och semantisk sökning.
- LLM och embeddings.
- Lokal AI-inferens med Ollama.
- FastAPI och backend-utveckling.
- React och frontend-utveckling.
- Docker och serverdrift.
- Kommunikation mellan separata tjänster.

---

## 🚀 Funktioner

- **Lokal AI-bearbetning** – Dokument och frågor kan behandlas lokalt utan att data behöver skickas till externa molntjänster.
- **RAG-flöde** – Text extraheras från PDF-filer med `PDFPlumber`, rensas med Regex och delas upp i mindre textbitar (`chunk_size=2500`).
- **Vektorbaserad sökning** – Textbitar omvandlas till embeddings och lagras persistent i **ChromaDB**.
- **Konversationsminne** – Tidigare frågor och svar sparas under sessionen. Äldre historik kan sammanfattas för att minska användningen av VRAM och kontextfönster.
- **Realtids-streaming** – AI-svar skickas från FastAPI till React-klienten via **Server-Sent Events (SSE)**.
- **Sessionshantering** – Unika UUID-baserade sessioner används för att kunna hantera flera samtidiga användare.
- **Filhantering** – Uppladdade filer får UUID-baserade filnamn och skrivs till disk med `shutil.copyfileobj`.
- **React-baserat gränssnitt** – Komponentbaserad frontend med Markdown-stöd, automatisk scrollning och CSS-animationer.
- **Källhänvisningar** – Visar vilka sidor och textbitar som använts som underlag för AI-svaret.
- **Expanderbara källor** – Användaren kan öppna källhänvisningarna och läsa hela det relevanta textstycket.

---

## 🎬 Demo

https://github.com/user-attachments/assets/21b88ec2-863a-4fcb-bd2b-c65d951e971a

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

### Backend

- Python
- FastAPI
- LangChain
- ChromaDB
- PDFPlumber

### Frontend

- React
- Vite
- React Markdown

### AI

- Ollama
- LLM, exempelvis `gemma4:e4b`
- Embeddings-modell, exempelvis `bge-m3`

---

## 🏗️ Arkitektur

Applikationen är uppdelad i tre huvudsakliga delar:

```text
┌─────────────────────────┐
│       React / Vite      │
│        Frontend         │
└────────────┬────────────┘
             │
             │ HTTP / SSE
             ▼
┌─────────────────────────┐
│        FastAPI          │
│        Backend          │
│                         │
│  PDF → Text → Chunks    │
│  RAG → Search → Context │
└────────────┬────────────┘
             │
             │ API
             ▼
┌─────────────────────────┐
│         Ollama          │
│                         │
│    Embeddings + LLM     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│        ChromaDB         │
│     Vector Database     │
└─────────────────────────┘
```

AI-servern kan köras separat från FastAPI- och React-applikationen. Det gör att AI-inferensen kan ligga på en dator med kraftigare GPU medan själva applikationen körs på en annan maskin.

---

## 🔎 RAG-flöde

När en PDF laddas upp genomgår dokumentet följande steg:

```text
PDF
 ↓
PDFPlumber
 ↓
Text extraction
 ↓
Regex / text cleaning
 ↓
Chunking
 ↓
Embeddings
 ↓
ChromaDB
```

När användaren sedan ställer en fråga:

```text
User question
 ↓
Embedding
 ↓
Similarity search
 ↓
Relevant document chunks
 ↓
Context + conversation history
 ↓
Ollama / LLM
 ↓
Streaming response
 ↓
React UI
```

På detta sätt skickas relevanta delar av dokumentet till språkmodellen istället för att hela PDF-filen behöver skickas med varje fråga.

---

## ⚙️ Installation & Start

Följ stegen nedan för att köra projektet lokalt.

### Förutsättningar

Installera följande:

- Node.js
- Python
- Ollama

Ollama behöver vara installerat och igång med de modeller som används av projektet.

Exempel:

```bash
ollama pull gemma4:e4b
ollama pull bge-m3
```

### 🐍 1. Starta Backend

Navigera till backend-mappen:

```bash
cd backend
```

Skapa en virtuell Python-miljö:

```bash
python -m venv venv
```

Aktivera miljön.

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

Installera projektets beroenden:

```bash
pip install -r requirements.txt
```

### Miljövariabler

Kopiera `.env.example` till en ny fil:

```text
.env
```

Anpassa därefter inställningarna efter din lokala miljö.

Exempel:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=gemma4:e4b
EMBEDDING_MODEL=bge-m3
```

Om Ollama körs på en annan dator behöver `OLLAMA_BASE_URL` ändras till serverns IP-adress.

### Starta FastAPI

Kör:

```bash
uvicorn main:app --reload
```

Backend-servern startar normalt på:

```text
http://127.0.0.1:8000
```

### ⚛️ 2. Starta Frontend

Öppna en ny terminal och navigera till frontend-mappen:

```bash
cd frontend
```

Installera npm-paketen:

```bash
npm install
```

Kopiera `.env.example` till:

```text
.env
```

Kontrollera att API-adressen pekar mot rätt FastAPI-server.

Exempel:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Starta utvecklingsservern:

```bash
npm run dev
```

Vite visar därefter adressen till webbapplikationen i terminalen.

---

## 💻 Utvecklingsmiljö

Projektet är utvecklat för att kunna dela upp AI-inferensen från själva applikationen.

### AI-server

AI-delen körs på en separat Ubuntu Server-maskin.

**Hårdvara:**

- Nvidia RTX 4060M – 8 GB VRAM
- AMD Ryzen 7 8840HS
- 32 GB DDR5 5600 MHz CL40

**Programvara:**

- Ubuntu Server
- Ollama
- Docker

**Roll:**

AI-servern hanterar:

- LLM-generering
- Embeddings
- AI-relaterad bearbetning

### Utvecklingsmaskin

Backend och frontend utvecklas på en separat dator.

**Operativsystem:**

- CachyOS Linux

**Hårdvara:**

- AMD Radeon RX 9070 XT
- AMD Ryzen 9 5900X
- 32 GB DDR4 3600 MHz CL14

**Utvecklingsverktyg:**

- PyCharm – Backend
- WebStorm – Frontend

**Roll:**

- Utveckling
- FastAPI
- React
- API-routing
- Klienthantering

---

## 🐳 Driftsättning med Docker & Portainer

Applikationen är containeriserad och kan köras med `docker-compose.yml`.

Det gör det möjligt att sätta upp backend och frontend i en servermiljö utan att installera alla beroenden manuellt på värddatorn.

### Förutsättningar

- Docker
- Portainer, om applikationen ska administreras via Portainer
- En Ollama-server som är åtkomlig från applikationen

### Steg-för-steg via Portainer

1. Kontrollera att Ollama körs på servern.
2. Kontrollera att Ollama accepterar anslutningar från applikationen.
3. Logga in i Portainer.
4. Gå till **Stacks**.
5. Välj **Add stack**.
6. Välj **Repository** som byggmetod.
7. Ange GitHub-repositoriet.
8. Lägg till nödvändiga miljövariabler.
9. Starta stacken.

Exempel på miljövariabler:

```env
VITE_API_URL=http://<SERVER_IP>:5174
OLLAMA_BASE_URL=http://<SERVER_IP>:11434
LLM_MODEL=gemma4:e4b
EMBEDDING_MODEL=bge-m3
```

Byt ut `<SERVER_IP>` mot IP-adressen till den server där tjänsterna körs.

---

## 🔐 Filhantering och sessionshantering

Uppladdade PDF-filer sparas inte med användarens ursprungliga filnamn som fysisk sökväg.

Istället används UUID-baserade filnamn.

Exempel:

```text
original.pdf
        ↓
550e8400-e29b-41d4-a716-446655440000.pdf
```

Det minskar risken för att användarens filnamn används för att manipulera sökvägar.

Filer kopieras till disk med `shutil.copyfileobj` istället för att läsa in hela filen i minnet.

Sessioner identifieras med UUID:

```text
User
 ↓
UUID session
 ↓
Conversation history
 ↓
Uploaded documents
```
---

## 🔐 Säkerhet & integritet

Projektet är utformat för lokal AI-bearbetning. När Ollama körs inom den
egna infrastrukturen behöver dokument och frågor inte skickas till externa
AI-tjänster.

Applikationen bör dock betraktas som ett utvecklingsprojekt och inte som en
färdig produktionslösning. Ytterligare säkerhetsåtgärder, exempelvis
autentisering, åtkomstkontroll, rate limiting och hårdare validering av
användarinput, skulle behövas innan applikationen exponeras publikt.

Uppladdade filer hanteras med UUID-baserade filnamn för att minska risken
för att ursprungliga filnamn används för manipulation av filsökvägar.

---

## 📡 Realtidskommunikation

AI-svaren skickas till frontend med **Server-Sent Events (SSE)**.

Istället för att vänta på att hela svaret ska genereras skickas delar av svaret löpande:

```text
Ollama
   ↓
FastAPI
   ↓
SSE stream
   ↓
React
   ↓
UI uppdateras kontinuerligt
```

Det gör att användaren kan börja läsa svaret direkt medan modellen fortfarande genererar resten.

---

## 📚 Källhänvisningar

En viktig del av applikationen är att visa vilket dokumentmaterial som ligger bakom AI-svaret.

För varje relevant chunk kan applikationen visa exempelvis:

- Dokument
- Sida
- Textstycke
- Relevanta delar av dokumentet

Exempel:

```text
Källa
├── Dokument: rapport.pdf
├── Sida: 14
└── Chunk: "...relevant text från dokumentet..."
```

Det gör det enklare att kontrollera var informationen i AI-svaret kommer ifrån.

---

## 📂 Projektstruktur

En förenklad bild av projektets struktur:

```text
Smart-PDF-Assistant/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.*
│   ├── .env.example
│   └── ...
│
├── images/
│   ├── upload.png
│   ├── chat.png
│   └── sources.png
│
├── docker-compose.yml
└── README.md
```

---

## 🚧 Framtida utveckling

- [ ] **SQL-databas** – Integrera PostgreSQL via SQLAlchemy för beständig lagring av användarsessioner och dokumentmetadata.
- [ ] **Fler filformat** – Stöd för `.docx` och `.txt`.
- [ ] **Användarkonton** – Separata användarkonton och autentisering.
- [ ] **Persistent chat history** – Spara konversationer mellan sessioner.
- [ ] **Dokumenthantering** – Möjlighet att visa, ta bort och organisera uppladdade dokument.
- [ ] **Fler embeddings-modeller** – Möjlighet att välja embeddings-modell.
- [ ] **Fler LLM-modeller** – Möjlighet att välja språkmodell från gränssnittet.
- [ ] **Bättre källvisning** – Tydligare markering av exakt var i dokumentet informationen hittades.
- [ ] **OCR-stöd** – Möjlighet att analysera PDF-filer som huvudsakligen består av inskannade bilder.
- [ ] **Streaming-förbättringar** – Bättre hantering av avbrutna och återupptagna AI-svar.

---

## ⚠️ Begränsningar

Projektet är utvecklat som ett lokalt AI- och RAG-projekt och bör ses som en teknisk prototyp.

Svar från språkmodellen kan fortfarande innehålla felaktigheter även om relevanta dokumentkällor visas. Källhänvisningarna visar vilket material som skickats till modellen, men garanterar inte att modellens slutsats är korrekt.

Prestandan påverkas också av vilken LLM, embeddings-modell och hårdvara som används.

---

## 📜 License

Detta projekt distribueras under **MIT License**.

```text
MIT License

Copyright (c) 2026 Smart PDF assistant

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🤖 AI-assistans och kodgenerering

AI-verktyg har använts som stöd under utvecklingen av projektet.

AI har bland annat använts för:

- Idéer och problemlösning
- Felsökning
- Kodförslag
- Strukturering av komponenter
- Dokumentation
- Förslag på förbättringar

Den slutliga implementationen har granskats och anpassats manuellt.

AI-verktygen har fungerat som ett stöd i utvecklingsprocessen och inte som en ersättning för utvecklingsarbetet.
