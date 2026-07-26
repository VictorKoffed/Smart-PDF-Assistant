# 📄 Smart PDF-Assistent

En lokal AI-applikation för dokumentanalys (RAG - Retrieval-Augmented Generation) som låter dig ladda upp PDF-filer och ställa interaktiva frågor om deras innehåll. Systemet körs helt lokalt med hjälp av **Ollama**, **FastAPI** och **React**.

---

## 🚀 Funktioner
* **Lokal & Säker:** All AI-bearbetning sker lokalt via Ollama utan att data skickas till externa molntjänster.
* **Smart RAG-flöde:** Delar upp PDF-dokument i hanterbara textbitar (chunks), skapar embeddings och sparar i en persistent vektordatabas (**ChromaDB**).
* **Interaktiv Chatt:** Gränssnitt inspirerat av moderna AI-plattformar med Markdown-stöd och automatisk scroll.
* **Källhänvisningar:** Visar exakt vilka sidor och textstycken (chunks) som AI använt för att generera sitt svar, med möjlighet att expandera och läsa hela stycket.
* **Konversationsminne:** Assistenten kommer ihåg kontexten från tidigare frågor i samma session.

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
1. Navigera till mappen för din backend i terminalen.
2. Skapa och aktivera en virtuell miljö (valfritt men rekommenderat):
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
