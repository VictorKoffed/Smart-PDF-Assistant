// =====================================================================
// REACT FRONTEND - HUVUDKOMPONENT (App.jsx)
// ---------------------------------------------------------------------
// Denna fil hanterar hela gränssnittet för Smart PDF-Assistent:
// - Uppladdningsvy för PDF-filer.
// - Interaktiv chattvy med meddelandehantering och Markdown-stöd.
// - Sessionshantering för att isolera användardata mot backend.
// =====================================================================

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// =====================================================================
// KOMPONENT: KÄLLHÄNVISNINGSKORT
// =====================================================================
function SourceCard({ src }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const isLong = src.content.length > 200

    return (
        <div className="source-card">
            <div className="source-header">
                <span className="source-tag">
                    {src.page.toUpperCase()}
                </span>
            </div>

            <div
                onClick={() => isLong && setIsExpanded(!isExpanded)}
                className={`source-content ${isLong ? 'expandable' : ''}`}
                title={isLong ? "Klicka för att visa/dölja hela texten" : ""}
            >
                <span className="source-text">
                    "{isExpanded || !isLong ? src.content : src.content.substring(0, 200) + '...'}"
                </span>
                {isLong && (
                    <span className="source-expand-btn">
                        {isExpanded ? '[ Fäll ihop ]' : '[ Visa hela chunken ]'}
                    </span>
                )}
            </div>
        </div>
    )
}

// =====================================================================
// HUVUDKOMPONENT: APP
// =====================================================================
function App() {
    // STATE-HANTERING
    const [file, setFile] = useState(null)
    const [loadedFileName, setLoadedFileName] = useState('')
    const [uploadStatus, setUploadStatus] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isDocumentReady, setIsDocumentReady] = useState(false)

    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState([])
    const [isAsking, setIsAsking] = useState(false)

    const chatEndRef = useRef(null)
    const sessionIdRef = useRef(crypto.randomUUID ? crypto.randomUUID() : Date.now().toString())

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const uploadPDF = async () => {
        if (!file) return setUploadStatus('Vänligen välj en fil först.')

        setIsUploading(true)
        setIsDocumentReady(false)
        setUploadStatus('Laddar upp och analyserar dokumentet...')

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: { 'X-Session-ID': sessionIdRef.current },
                body: formData,
            })
            if (!response.ok) throw new Error('Serverfel vid uppladdning')
            const data = await response.json()

            setUploadStatus('✅ ' + data.message)
            setLoadedFileName(file.name)
            setIsDocumentReady(true)

            setMessages([
                {
                    role: 'ai',
                    text: `Hej! Jag har läst igenom "${file.name}". Vad vill du veta om dokumentet? Ställ gärna en fråga så hjälper jag dig!`
                }
            ])

            setFile(null)
        } catch (error) {
            setUploadStatus('❌ Uppladdning misslyckades. Körs backend?')
        } finally {
            setIsUploading(false)
        }
    }

    const askAI = async () => {
        if (!question.trim()) return

        const currentQuestion = question

        setMessages(prev => [...prev, { role: 'user', text: currentQuestion }])
        setQuestion('')
        setIsAsking(true)

        setMessages(prev => [...prev, {
            role: 'ai',
            text: 'Tänker',
            isTemp: true,
            isThinking: true
        }])

        try {
            const response = await fetch(`${API_URL}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionIdRef.current
                },
                body: JSON.stringify({ question: currentQuestion }),
            })

            if (!response.ok) throw new Error('Kommunikationsfel mot servern')

            const data = await response.json()

            setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = {
                    role: 'ai',
                    text: data.answer,
                    sources: data.sources
                }
                return newMessages
            })
        } catch (error) {
            const errorMessage = '❌ Kunde inte nå servern eller så avbröts anropet.'
            setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = { role: 'ai', text: errorMessage }
                return newMessages
            })
        } finally {
            setIsAsking(false)
        }
    }

    const Spinner = () => (
        <svg className="spinner-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12" />
            </path>
        </svg>
    )

    return (
        <div className="app-container">
            <div className="app-wrapper">

                {/* HEADER */}
                <div className="header">
                    <div className="header-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="var(--panel-bg)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2V8H20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="8" y1="13" x2="16" y2="13" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                            <line x1="8" y1="17" x2="13" y2="17" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                            <circle cx="17" cy="6" r="3" fill="var(--accent)"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="header-title">Smart PDF-Assistent</h1>
                        <p className="header-subtitle">AI-driven dokumentanalys (Prototyp)</p>
                    </div>
                </div>

                {/* VY 1: UPPPLADDNINGSRUTA */}
                {!isDocumentReady && (
                    <div className="upload-container">
                        <div className="upload-card">
                            {isUploading ? (
                                <div className="uploading-state">
                                    <div className="spinner-container">
                                        <Spinner />
                                    </div>
                                    <h2 className="uploading-title">Bearbetar dokumentet...</h2>
                                    <p className="uploading-desc">AI:n läser in och indexerar texten.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="upload-icon">📂</div>
                                    <h2 className="upload-title">Välkommen</h2>
                                    <p className="upload-desc">Ladda upp en PDF för att starta konversationen och ställa frågor om innehållet.</p>

                                    <div className="upload-actions">
                                        <label className="upload-label">
                                            <span className="upload-file-name">
                                                {file ? `📄 ${file.name}` : 'Klicka här för att välja PDF-fil'}
                                            </span>
                                            <span className="upload-file-hint">
                                                {file ? 'Fil vald och redo att laddas upp' : 'Endast PDF-filer stöds'}
                                            </span>
                                            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden-file-input" />
                                        </label>

                                        <button
                                            onClick={uploadPDF}
                                            disabled={!file}
                                            className={`upload-btn ${file ? 'active' : 'disabled'}`}
                                        >
                                            Analysera dokument
                                        </button>
                                    </div>

                                    {uploadStatus && (
                                        <div className="upload-status-msg">
                                            {uploadStatus}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* VY 2: CHATTGRÄNSSNITT */}
                {isDocumentReady && (
                    <>
                        <div className="chat-container">
                            {messages.map((msg, index) => {
                                const isLongUserMessage = msg.role === 'user' && msg.text.length > 250;

                                return (
                                    <div key={index} className={`message-wrapper ${msg.role}`}>
                                        <div className={`message-bubble ${msg.role}`}>
                                            {msg.role === 'ai' && <strong className="message-sender">Smart PDF-Assistent</strong>}

                                            {isLongUserMessage ? (
                                                <details className="msg-details">
                                                    <summary className="msg-summary">
                                                        <span>{msg.text.substring(0, 100)}...</span>
                                                        <span className="msg-expand-hint">[ Visa hela ditt meddelande ]</span>
                                                    </summary>
                                                    <div className="msg-expanded-text">
                                                        {msg.text}
                                                    </div>
                                                </details>
                                            ) : (
                                                <div className={msg.isTemp ? 'msg-temp' : ''}>
                                                    {msg.role === 'ai' && !msg.isTemp ? (
                                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                    ) : (
                                                        <span>
                                                            {msg.text}
                                                            {msg.isThinking && (
                                                                <span>
                                                                    <span className="dot-1">.</span>
                                                                    <span className="dot-2">.</span>
                                                                    <span className="dot-3">.</span>
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* KÄLLHÄNVISNINGAR MED UNIKA SIDOR */}
                                            {msg.sources && msg.sources.length > 0 && !msg.isTemp && (() => {
                                                const uniqueSources = Array.from(
                                                    new Map(msg.sources.map(src => [src.page, src])).values()
                                                );

                                                return (
                                                    <div className="sources-container">
                                                        <details className="sources-details">
                                                            <summary className="sources-summary">
                                                                <span>🔍 Källor från dokumentet ({uniqueSources.length} {uniqueSources.length === 1 ? 'sida' : 'sidor'})</span>
                                                            </summary>

                                                            <div className="sources-list">
                                                                {uniqueSources.map((src, sIndex) => (
                                                                    <SourceCard key={sIndex} src={src} />
                                                                ))}
                                                            </div>
                                                        </details>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* INMATNINGSFÄLT FÖR FRÅGOR */}
                        <div className="input-container">
                            <input
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                                placeholder="Skriv din fråga här..."
                                autoFocus
                                className="chat-input"
                                disabled={isAsking}
                            />
                            <button
                                onClick={askAI}
                                disabled={isAsking || !question.trim()}
                                className="send-btn"
                            >
                                Skicka
                            </button>
                        </div>

                        {/* SIDFOT MED DOKUMENTBYTE */}
                        <div className="footer">
                            <div>
                                <span className="footer-hint">Aktuellt dokument: </span>
                                <strong>{loadedFileName}</strong>
                            </div>

                            <div className="footer-actions">
                                <span className="footer-hint">Vill du byta?</span>
                                <input
                                    key={loadedFileName}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="footer-file-input"
                                />
                                {file && (
                                    <button onClick={uploadPDF} className="change-doc-btn">
                                        Analysera nytt dokument
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default App