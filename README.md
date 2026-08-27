# 📄 Smart PDF Assistant

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?logo=ollama)](https://ollama.com/)

A local AI application for document analysis using **RAG (Retrieval-Augmented Generation)**. The application allows users to upload PDF files and ask questions about their contents. AI processing runs locally within their own infrastructure using
**Ollama**, while the backend and frontend handle documents, searches, and
the user interface.

---

## 📑 Contents

- [Project Background](#-project-background)
- [Features](#-features)
- [Demo](#-demo)
- [Screenshots](#-screenshots)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [RAG Flow](#-rag-flow)
- [Installation & Startup](#️-installation--startup)
- [Development Environment](#-development-environment)
- [Deployment with Docker & Portainer](#-deployment-with-docker--portainer)
- [File and Session Management](#-file-and-session-management)
- [Security & Privacy](#-security--privacy)
- [Real-Time Communication](#-real-time-communication)
- [Source References](#-source-references)
- [Project Structure](#-project-structure)
- [Future Development](#-future-development)
- [Limitations](#️-limitations)
- [AI Assistance and Code Generation](#-ai-assistance-and-code-generation)

---

## 🎯 Project Background

This project was developed in my spare time as a personal technical project with
a focus on local AI, RAG, and full-stack development.

The goal was to explore how modern AI components can be combined with a custom
backend and frontend to create a practical application for document analysis.

The project has primarily served as a way to deepen my knowledge of:

- RAG and semantic search.
- LLMs and embeddings.
- Local AI inference with Ollama.
- FastAPI and backend development.
- React and frontend development.
- Docker and server operations.
- Communication between separate services.

---

## 🚀 Features

- **Local AI processing** – Documents and questions can be processed locally without sending data to external cloud services.
- **RAG pipeline** – Text is extracted from PDF files using `PDFPlumber`, cleaned with Regex, and split into smaller text chunks (`chunk_size=2500`).
- **Vector-based search** – Text chunks are converted into embeddings and stored persistently in **ChromaDB**.
- **Conversation memory** – Previous questions and answers are stored during the session. Older history can be summarized to reduce VRAM and context-window usage.
- **Real-time streaming** – AI responses are sent from FastAPI to the React client using **Server-Sent Events (SSE)**.
- **Session management** – Unique UUID-based sessions are used to support multiple concurrent users.
- **File management** – Uploaded files are given UUID-based filenames and written to disk using `shutil.copyfileobj`.
- **React-based interface** – Component-based frontend with Markdown support, automatic scrolling, and CSS animations.
- **Source references** – Shows which pages and text chunks were used as the basis for the AI response.
- **Expandable sources** – Users can expand the source references and read the full relevant text.

---

## 🎬 Demo

https://github.com/user-attachments/assets/21b88ec2-863a-4fcb-bd2b-c65d951e971a

---

## 📸 Screenshots

### Upload View

![Uppladdning](images/upload.png)

### Chat Interface

![Chatt](images/chat.png)

### Source References

![Källor](images/sources.png)

---

## 🛠️ Tech Stack

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
- LLM, for example `gemma4:e4b`
- Embedding model, for example `bge-m3`

---

## 🏗️ Architecture

The application is divided into three main components:

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

The AI server can run separately from the FastAPI and React application. This allows AI inference to run on a machine with a more powerful GPU while the application itself runs on another machine.

---

## 🔎 RAG Flow

When a PDF is uploaded, the document goes through the following steps:

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

When the user then asks a question:

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

This way, only relevant parts of the document are sent to the language model instead of the entire PDF being included with every question.

---

## ⚙️ Installation & Startup

Follow the steps below to run the project locally.

### Prerequisites

Install the following:

- Node.js
- Python
- Ollama

Ollama must be installed and running with the models used by the project.

Example:

```bash
ollama pull gemma4:e4b
ollama pull bge-m3
```

### 🐍 1. Start the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment.

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

Install the project dependencies:

```bash
pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to a new file:

```text
.env
```

Then adjust the settings to match your local environment.

Example:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=gemma4:e4b
EMBEDDING_MODEL=bge-m3
```

If Ollama is running on another machine, change `OLLAMA_BASE_URL` to the server's IP address.

### Start FastAPI

Run:

```bash
uvicorn main:app --reload
```

The backend server normally starts at:

```text
http://127.0.0.1:8000
```

### ⚛️ 2. Start the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the npm packages:

```bash
npm install
```

Copy `.env.example` to:

```text
.env
```

Make sure the API address points to the correct FastAPI server.

Example:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Vite will then display the address of the web application in the terminal.

---

## 💻 Development Environment

The project is designed to separate AI inference from the application itself.

### AI Server

The AI component runs on a separate Ubuntu Server machine.

**Hardware:**

- Nvidia RTX 4060M – 8 GB VRAM
- AMD Ryzen 7 8840HS
- 32 GB DDR5 5600 MHz CL40

**Software:**

- Ubuntu Server
- Ollama
- Docker

**Role:**

The AI server handles:

- LLM generation
- Embeddings
- AI-related processing

### Development Machine

The backend and frontend are developed on a separate computer.

**Operating System:**

- CachyOS Linux

**Hardware:**

- AMD Radeon RX 9070 XT
- AMD Ryzen 9 5900X
- 32 GB DDR4 3600 MHz CL14

**Development Tools:**

- PyCharm – Backend
- WebStorm – Frontend

**Role:**

- Development
- FastAPI
- React
- API routing
- Client handling

---

## 🐳 Deployment with Docker & Portainer

The application is containerized and can be run using `docker-compose.yml`.

This makes it possible to deploy the backend and frontend in a server environment without manually installing all dependencies on the host machine.

### Prerequisites

- Docker
- Portainer, if the application is to be managed through Portainer
- An Ollama server accessible from the application

### Step-by-Step via Portainer

1. Make sure Ollama is running on the server.
2. Make sure Ollama accepts connections from the application.
3. Log in to Portainer.
4. Go to **Stacks**.
5. Select **Add stack**.
6. Select **Repository** as the deployment method.
7. Enter the GitHub repository.
8. Add the required environment variables.
9. Start the stack.

Example environment variables:

```env
VITE_API_URL=http://<SERVER_IP>:5174
OLLAMA_BASE_URL=http://<SERVER_IP>:11434
LLM_MODEL=gemma4:e4b
EMBEDDING_MODEL=bge-m3
```

Replace `<SERVER_IP>` with the IP address of the server where the services are running.

---

## 🔐 File and Session Management

Uploaded PDF files are not stored using the user's original filename as the physical file path.

Instead, UUID-based filenames are used.

Example:

```text
original.pdf
        ↓
550e8400-e29b-41d4-a716-446655440000.pdf
```

This reduces the risk of user-provided filenames being used to manipulate file paths.

Files are copied to disk using `shutil.copyfileobj` instead of loading the entire file into memory.

Sessions are identified using UUIDs:

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

## 🔐 Security & Privacy

The project is designed for local AI processing. When Ollama runs within your
own infrastructure, documents and questions do not need to be sent to external
AI services.

However, the application should be considered a development project rather
than a production-ready solution. Additional security measures, such as
authentication, access control, rate limiting, and stricter user-input
validation, would be required before exposing the application publicly.

Uploaded files use UUID-based filenames to reduce the risk of original
filenames being used to manipulate file paths.

---

## 📡 Real-Time Communication

AI responses are sent to the frontend using **Server-Sent Events (SSE)**.

Instead of waiting for the entire response to be generated, parts of the response are sent continuously:

```text
Ollama
   ↓
FastAPI
   ↓
SSE stream
   ↓
React
   ↓
UI updated continuously
```

This allows the user to start reading the response immediately while the model is still generating the rest.

---

## 📚 Source References

An important part of the application is showing which document material the AI response is based on.

For each relevant chunk, the application can display, for example:

- Document
- Page
- Text excerpt
- Relevant parts of the document

Example:

```text
Source
├── Document: rapport.pdf
├── Page: 14
└── Chunk: "...relevant text from the document..."
```

This makes it easier to verify where the information in the AI response comes from.

---

## 📂 Project Structure

A simplified view of the project structure:

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

## 🚧 Future Development

- [ ] **SQL database** – Integrate PostgreSQL via SQLAlchemy for persistent storage of user sessions and document metadata.
- [ ] **More file formats** – Support for `.docx` and `.txt`.
- [ ] **User accounts** – Separate user accounts and authentication.
- [ ] **Persistent chat history** – Save conversations across sessions.
- [ ] **Document management** – Ability to view, delete, and organize uploaded documents.
- [ ] **More embedding models** – Allow users to select the embedding model.
- [ ] **More LLM models** – Allow users to select the language model from the interface.
- [ ] **Improved source display** – Clearer indication of exactly where information was found in the document.
- [ ] **OCR support** – Ability to analyze PDF files that primarily consist of scanned images.
- [ ] **Streaming improvements** – Better handling of interrupted and resumed AI responses.

---

## ⚠️ Limitations

The project was developed as a local AI and RAG project and should be considered a technical prototype.

Language model responses may still contain inaccuracies even when relevant document sources are shown. The source references indicate which material was sent to the model, but do not guarantee that the model's conclusion is correct.

Performance is also affected by the LLM, embedding model, and hardware being used.

---

## 🤖 AI Assistance and Code Generation

AI tools have been used as support during the development of the project.

AI has been used for:

- Ideas and problem-solving
- Debugging
- Code suggestions
- Component structuring
- Documentation
- Suggestions for improvements

The final implementation has been reviewed and manually adapted.

The AI tools have served as support throughout the development process, not as a replacement for development work.
