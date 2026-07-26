# =====================================================================
# TJÄNSTKLASS FÖR PDF OCH RAG-LOGIK (services.py)
# ---------------------------------------------------------------------
# Denna fil hanterar kärnlogiken för projektet:
# - Läsa in och stycka upp PDF-dokument.
# - Skapa och hantera vektordatabasen (ChromaDB) med embeddings.
# - Styra konversationsminne och promptbyggande.
# - Kommunicera med lokal AI-modell via Ollama.
# =====================================================================

import os
import logging
from typing import List, Dict, Any
import ollama

import chromadb
from chromadb.config import Settings

from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Konfigurera loggning för felsökning och spårning
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFDocumentAssistant:
    """
    Huvudklass som samlar all funktionalitet för dokumenthantering,
    vektorsökning och AI-generering.
    """

    def __init__(self, upload_dir: str, vector_db_dir: str, ollama_host: str, model_name: str, embedding_model: str):
        self.upload_dir = upload_dir
        self.vector_db_dir = vector_db_dir
        self.ollama_host = ollama_host
        self.model_name = model_name
        self.embedding_model = embedding_model

        # Håller reda på om en aktiv vektordatabas/dokument finns inläst
        self.vectorstore = None

        # Säkerställ att mappen för uppladdade filer existerar lokalt
        os.makedirs(self.upload_dir, exist_ok=True)

        try:
            # Initiera persistent ChromaDB-klient för att spara vektorer på disk
            self.chroma_client = chromadb.PersistentClient(
                path=self.vector_db_dir,
                settings=Settings(allow_reset=True)
            )
            # Initiera Ollama-klienten med angiven host-adress
            self.ollama_client = ollama.Client(host=self.ollama_host)
        except Exception as e:
            logger.error(f"Kunde inte initiera databas eller Ollama-klient: {e}")
            raise

        # Lista för att spara enklare konversationshistorik (minne)
        self.chat_history: List[tuple] = []

    def clear_memory(self):
        """
        Rensar konversationsminnet och tömmer vektordatabasen helt.
        Körs automatiskt vid varje ny PDF-uppladdning.
        """
        self.chat_history.clear()
        self.vectorstore = None
        try:
            self.chroma_client.reset()
        except Exception as e:
            logger.warning(f"Kunde inte nollställa ChromaDB: {e}")

    def process_pdf(self, file_path: str) -> None:
        """
        Steg 1-3 i RAG-flödet:
        - Läser in PDF-filen.
        - Delar upp texten i hanterbara bitar (chunks).
        - Skapar embeddings och sparar ner dem i ChromaDB.
        """
        try:
            # 1. Läs in PDF-dokumentet sida för sida
            loader = PyPDFLoader(file_path)
            docs = loader.load()

            if not docs:
                raise ValueError("PDF-filen verkar vara tom eller kunde inte läsas.")

            # 2. Dela upp texten i mindre bitar för att passa modellens kontextfönster
            # ANPASSNING: Ändra chunk_size eller chunk_overlap vid behov av mer/mindre detaljer.
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
            splits = text_splitter.split_documents(docs)

            # 3. Skapa vektorer (embeddings) och spara i ChromaDB samt sätt vectorstore
            self.vectorstore = Chroma.from_documents(
                client=self.chroma_client,
                documents=splits,
                embedding=OllamaEmbeddings(model=self.embedding_model, base_url=self.ollama_host)
            )
        except Exception as e:
            logger.error(f"Fel vid bearbetning av PDF: {e}")
            raise RuntimeError(f"Kunde inte bearbeta PDF-dokumentet: {str(e)}")

    def query_rag(self, question: str) -> Dict[str, Any]:
        """
        Steg 4-6 i RAG-flödet:
        - Sök upp relevanta textdelar baserat på användarens fråga (Similarity Search).
        - Bygg en strukturerad prompt med kontext, historik och strikta regler.
        - Skicka till Ollama-modellen och returnera svar + källor.
        """
        try:
            # Koppla upp mot den befintliga vektordatabasen
            vectorstore = Chroma(
                client=self.chroma_client,
                embedding_function=OllamaEmbeddings(model=self.embedding_model, base_url=self.ollama_host)
            )

            # Hämta de k mest relevanta textbitarna (chunks) från dokumentet
            # ANPASSNING: Ändra k=3 till t.ex. k=2 om modellens svarstider behöver snabbas upp.
            docs = vectorstore.similarity_search(question, k=3)

            context = ""
            sources = set()

            for doc in docs:
                context += doc.page_content + "\n\n"
                page_num = doc.metadata.get("page")
                page_str = f"Sida {page_num + 1}" if page_num is not None else "Okänd sida"
                sources.add((page_str, doc.page_content.strip()))

            # Bygg historik-text av de senaste meddelandena
            history_text = ""
            if self.chat_history:
                history_text = "Tidigare konversation:\n"
                for q, a in self.chat_history[-3:]:
                    history_text += f"Användare: {q}\nAI: {a}\n\n"

            # Skapa den slutgiltiga prompten med strikta regler för AI-beteende
            prompt = f"""Du är "Smart PDF-Assistent", en professionell AI utvecklad för att svara på frågor om uppladdade dokument. 

VIKTIGA REGLER:
0. ABSOLUT FÖRBUD MOT TÄNKANDE: Börja direkt på svaret. Skriv ALDRIG inledningar som "Uppmärksamhet!", "Jag ser till...", "För att svara på din fråga..." eller liknande. Svara rakt på sak.
1. Din identitet: Om användaren frågar vem DU är, svara vänligt att du är Smart PDF-Assistent.
2. Dina funktioner: Om användaren frågar vad du kan göra, berätta att du kan analysera PDF-dokument, svara på frågor och komma ihåg kontexten.
3. Vem dokumentet tillhör: Om användaren frågar vems dokumentet är eller vem som omnämns i texten, leta i dokumentet nedan och svara på det.
4. Användaren bakom skärmen: Om användaren frågar vem hen själv är, svara att du inte vet vem som sitter vid tangentbordet.
5. Dokumentets identitet: Du är INTE personen i dokumentet. Prata alltid om personen i texten i tredje person.
6. Fakta: Basera dina svar om dokumentets innehåll ENDAST på texten nedan. Gissa aldrig.
7. Subjektiva frågor: Om användaren frågar vad som är "bäst" eller "mest imponerande", peka sakligt på vad som finns i dokumentet.

{history_text}
Här är relevant text från dokumentet:
{context}

Ny fråga: {question}
Svar:"""

            # Anropa Ollama för att generera svaret
            response = self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt
            )

            answer = response.get('response', 'Inget svar genererades.')
            self.chat_history.append((question, answer))

            # Formatera källorna till en snygg struktur för frontend
            formatted_sources = [{"page": page, "content": content} for page, content in sources]

            return {
                "answer": answer,
                "sources": formatted_sources
            }

        except Exception as e:
            logger.error(f"Fel vid generering av svar från AI: {e}")
            raise RuntimeError(f"Kunde inte kommunicera med AI-modellen: {str(e)}")