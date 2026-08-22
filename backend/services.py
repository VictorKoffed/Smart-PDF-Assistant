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
import re
import json
import logging
from typing import List, Dict, Any, Generator
import ollama

import chromadb
from chromadb.config import Settings

from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Konfigurera loggning för felsökning och spårning
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =====================================================================
# AI PROMPT-MALL (DRY - Don't Repeat Yourself)
# ---------------------------------------------------------------------
# Genom att ha prompten här uppe som en konstant, behöver vi bara
# ändra AI:ns regler och beteende på ETT ställe, istället för i
# varje metod som gör ett anrop.
# =====================================================================
RAG_SYSTEM_PROMPT = """You are "Smart PDF-Assistent", a professional AI designed to act as an advocate and answer questions about the uploaded CV/portfolio document.

CRITICAL RULES:
0. Language: You must ALWAYS respond in Swedish, regardless of the prompt language.
1. Direct Output: Output the response directly without conversational fillers, preambles, or meta-commentary (e.g., do not start with "Självklart, här är svaret...").
2. Your Identity: If asked who you are, state that you are "Smart PDF-Assistent". You do not know who the user is.
3. Document Identity: You are NOT the person in the document. Always refer to the person in the text in the third person (by name, he, or she).
4. Subjective Questions: If asked what is "best" or "most impressive", objectively point out what is explicitly stated in the document.
5. Facts & Inference (YOUR WIGGLE ROOM): 
   - Strict Facts: You may NEVER invent or guess skills, work experiences, or background details.
   - Professional Inference: You ARE encouraged to use your general tech industry knowledge to analyze the facts. For example, if the text lists frontend and backend technologies, you may logically infer that the person is suited for fullstack roles and explain why, even if the word "fullstack" is not explicitly written.

{summary_text}{history_text}
--- DOCUMENT CONTEXT START ---
{context}
--- DOCUMENT CONTEXT END ---

FINAL INSTRUCTIONS (MUST OBEY):
- Base your factual answers SOLELY on the document context above.
- If the user asks for specific factual information (like a job or degree) that cannot be found or logically inferred from the context, you must state exactly: "Tyvärr finns inte den informationen i dokumentet." Do not guess.

New question: {question}
Answer directly in Swedish:"""

class PDFDocumentAssistant:
    """
    Huvudklass som samlar all funktionalitet för dokumenthantering,
    vektorsökning och AI-generering.
    """

    def __init__(
        self,
        upload_dir: str,
        vector_db_dir: str,
        ollama_host: str,
        model_name: str,
        embedding_model: str,
        chunk_size: int = 2500,
        chunk_overlap: int = 250,
        k: int = 6
    ):
        self.upload_dir = upload_dir
        self.vector_db_dir = vector_db_dir
        self.ollama_host = ollama_host
        self.model_name = model_name
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.k = k

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
        self.conversation_summary: str = ""

    def clear_memory(self):
        """
        Rensar konversationsminnet och tömmer vektordatabasen helt.
        Körs automatiskt vid varje ny PDF-uppladdning.
        """
        self.chat_history.clear()
        self.conversation_summary = ""
        self.vectorstore = None
        try:
            self.chroma_client.reset()
        except Exception as e:
            logger.warning(f"Kunde inte nollställa ChromaDB: {e}")

    def _summarize_memory(self) -> None:
        """
        Skapar en sammanfattning av konversationshistoriken för att hålla
        kontextfönstret litet och spara VRAM.
        """
        try:
            history_str = ""
            for q, a in self.chat_history:
                history_str += f"Användare: {q}\nAI: {a}\n\n"

            summary_prompt = f"""Sammanfatta följande konversation och tidigare sammanfattning på svenska i max 2-3 meningar.

Tidigare sammanfattning:
{self.conversation_summary}

Ny konversation att inkludera:
{history_str}

Kort sammanfattning:"""

            response = self.ollama_client.generate(
                model=self.model_name,
                prompt=summary_prompt,
               options={
                    "num_ctx": 4096,
                    "num_predict": 512  # Sammanfattningar behöver inte vara så långa
                }
            )
            self.conversation_summary = response.get('response', '').strip()

            # Behåll det absolut sista (senaste) meddelandeparet i listan
            if self.chat_history:
                last_pair = self.chat_history[-1]
                self.chat_history = [last_pair]
            else:
                self.chat_history = []
        except Exception as e:
            logger.error(f"Fel vid sammanfattning av minne: {e}")

    def process_pdf(self, file_path: str) -> None:
        """
        Steg 1-3 i RAG-flödet:
        - Läser in PDF-filen.
        - Delar upp texten i hanterbara bitar (chunks).
        - Skapar embeddings och sparar ner dem i ChromaDB.
        - Raderar filen från filsystemet när den bearbetats.
        """
        try:
            try:
                # 1. Läs in PDF-dokumentet sida för sida
                loader = PDFPlumberLoader(file_path)
                docs = loader.load()

                if not docs:
                    raise ValueError("PDF-filen verkar vara tom eller kunde inte läsas.")

                for doc in docs:
                    doc.page_content = re.sub(r"\s+", " ", doc.page_content).strip()

                # 2. Dela upp texten i mindre bitar för att passa modellens kontextfönster
                text_splitter = RecursiveCharacterTextSplitter(chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap)
                splits = text_splitter.split_documents(docs)

                # 3. Skapa vektorer (embeddings) och spara i ChromaDB samt sätt vectorstore
                self.vectorstore = Chroma.from_documents(
                    client=self.chroma_client,
                    documents=splits,
                    embedding=OllamaEmbeddings(model=self.embedding_model, base_url=self.ollama_host)
                )
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)
        except FileNotFoundError as e:
            logger.error(f"Filen hittades inte: {e}")
            raise RuntimeError(f"Kunde inte hitta PDF-dokumentet: {str(e)}")
        except ValueError as e:
            logger.error(f"Valideringsfel vid bearbetning av PDF: {e}")
            raise RuntimeError(f"Ogiltigt PDF-dokument: {str(e)}")
        except Exception as e:
            logger.error(f"Fel vid bearbetning av PDF: {e}")
            raise RuntimeError(f"Kunde inte bearbeta PDF-dokumentet: {str(e)}")

    def query_rag(self, question: str) -> Dict[str, Any]:
        """
        Steg 4-6 i RAG-flödet (Vanligt anrop, ej streaming):
        - Sök upp relevanta textdelar baserat på användarens fråga (Similarity Search).
        - Bygg en strukturerad prompt med kontext, historik och strikta regler.
        - Skicka till Ollama-modellen och returnera svar + källor.
        """
        try:
            if not self.vectorstore:
                raise ValueError("Ingen databas aktiv. Vänligen ladda upp ett dokument först.")

            docs = self.vectorstore.similarity_search(question, k=self.k)

            context = ""
            sources = set()

            for doc in docs:
                context += doc.page_content + "\n\n"
                page_num = doc.metadata.get("page")
                page_str = f"Sida {page_num + 1}" if page_num is not None else "Okänd sida"
                sources.add((page_str, doc.page_content.strip()))

            history_text = ""
            if self.chat_history:
                history_text = "Tidigare konversation:\n"
                for q, a in self.chat_history[-3:]:
                    history_text += f"Användare: {q}\nAI: {a}\n\n"

            summary_text = ""
            if self.conversation_summary:
                summary_text = f"Tidigare sammanfattad kontext:\n{self.conversation_summary}\n\n"

            # Använder den globala DRY-konstanten
            prompt = RAG_SYSTEM_PROMPT.format(
                summary_text=summary_text,
                history_text=history_text,
                context=context,
                question=question
            )

            response = self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt,
               options={
                    "num_ctx": 4096,
                    "num_predict": 1024
                }
            )

            answer = response.get('response', 'Inget svar genererades.')
            self.chat_history.append((question, answer))
            if len(self.chat_history) >= 3:
                self._summarize_memory()

            formatted_sources = [{"page": page, "content": content} for page, content in sources]

            return {
                "answer": answer,
                "sources": formatted_sources
            }

        except ValueError as e:
            logger.error(f"Valideringsfel vid AI-förfrågan: {e}")
            raise RuntimeError(str(e))
        except Exception as e:
            logger.error(f"Fel vid generering av svar från AI: {e}")
            raise RuntimeError(f"Kunde inte kommunicera med AI-modellen: {str(e)}")

    def stream_query_rag(self, question: str) -> Generator[str, None, None]:
        """
        Streaming-variant av query_rag som skickar källor först och därefter
        genererar svarstokens via SSE (Server-Sent Events).
        """
        try:
            if not self.vectorstore:
                raise ValueError("Ingen databas aktiv. Vänligen ladda upp ett dokument först.")

            docs = self.vectorstore.similarity_search(question, k=self.k)

            context = ""
            sources = set()

            for doc in docs:
                context += doc.page_content + "\n\n"
                page_num = doc.metadata.get("page")
                page_str = f"Sida {page_num + 1}" if page_num is not None else "Okänd sida"
                sources.add((page_str, doc.page_content.strip()))

            history_text = ""
            if self.chat_history:
                history_text = "Tidigare konversation:\n"
                for q, a in self.chat_history[-3:]:
                    history_text += f"Användare: {q}\nAI: {a}\n\n"

            summary_text = ""
            if self.conversation_summary:
                summary_text = f"Tidigare sammanfattad kontext:\n{self.conversation_summary}\n\n"

            # Använder den globala DRY-konstanten
            prompt = RAG_SYSTEM_PROMPT.format(
                summary_text=summary_text,
                history_text=history_text,
                context=context,
                question=question
            )

            formatted_sources = [{"page": page, "content": content} for page, content in sources]

            # Skicka källor först
            yield f"data: {json.dumps({'type': 'sources', 'sources': formatted_sources})}\n\n"

            stream = self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt,
                stream=True,
               options={
                    "num_ctx": 4096,      # Ökar kontextfönstret (minnet för prompt + dokument). Standard är ofta 2048.
                    "num_predict": 1024   # Ökar maxlängden på det genererade svaret.
                }
            )

            full_answer = ""
            for chunk in stream:
                token = chunk.get('response', '')
                if token:
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            self.chat_history.append((question, full_answer))
            if len(self.chat_history) >= 3:
                self._summarize_memory()

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Fel vid streaming av svar från AI: {e}")
            yield f"data: {json.dumps({'type': 'token', 'content': f'Kunde inte kommunicera med AI-modellen: {str(e)}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
