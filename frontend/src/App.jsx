// =====================================================================
// REACT FRONTEND - HUVUDKOMPONENT (App.jsx)
// ---------------------------------------------------------------------
// Denna fil hanterar hela gränssnittet för Smart PDF-Assistent:
// - Uppladdningsvy för PDF-filer.
// - Interaktiv chattvy med meddelandehantering och Markdown-stöd.
// - Kommunikation med FastAPI-backend via fetch.
//
// ANVISNING FÖR ATT STARTA KLIENTEN:
// Kör följande kommando i terminalen: npm run dev
// =====================================================================

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

// Enskild komponent för källkort så att state-hanteringen (visa hela chunken) blir helt stabil
function SourceCard({ src, accentColor, borderColor, textColor, bg }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const isLong = src.content.length > 200

    return (
        <div style={{
            backgroundColor: '#161719',
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            borderLeft: `3px solid ${accentColor}`,
            color: textColor,
            fontSize: '0.75rem',
            lineHeight: '1.4'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                    backgroundColor: accentColor,
                    color: bg,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px'
                }}>
                    {src.page.toUpperCase()}
                </span>
            </div>

            <div
                onClick={() => isLong && setIsExpanded(!isExpanded)}
                style={{ cursor: isLong ? 'pointer' : 'default', userSelect: 'none' }}
                title={isLong ? "Klicka för att visa/dölja hela texten" : ""}
            >
                <span style={{ opacity: 0.85, fontStyle: 'italic', display: 'block' }}>
                    "{isExpanded || !isLong ? src.content : src.content.substring(0, 200) + '...'}"
                </span>
                {isLong && (
                    <span style={{ color: accentColor, fontSize: '0.65rem', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                        {isExpanded ? '[ Fäll ihop ]' : '[ Visa hela chunken ]'}
                    </span>
                )}
            </div>
        </div>
    )
}

function App() {
    // =====================================================================
    // STATE-HANTERING (Tillstånd)
    // =====================================================================
    const [file, setFile] = useState(null)
    const [loadedFileName, setLoadedFileName] = useState('')
    const [uploadStatus, setUploadStatus] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isDocumentReady, setIsDocumentReady] = useState(false)

    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState([])
    const [isAsking, setIsAsking] = useState(false)

    // Referens för att automatiskt skrolla ner till senaste meddelandet i chatten
    const chatEndRef = useRef(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // =====================================================================
    // FILHANTERING & UPPLADDNING
    // =====================================================================
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
            const response = await fetch('http://127.0.0.1:8000/upload', {
                method: 'POST',
                body: formData,
            })
            if (!response.ok) throw new Error('Serverfel')
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

    // =====================================================================
    // FRÅGEHANTERING (RAG-ANROP MOT BACKEND)
    // =====================================================================
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
            const response = await fetch('http://127.0.0.1:8000/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentQuestion }),
            })

            if (!response.ok) throw new Error('Kommunikationsfel')

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

    // =====================================================================
    // DESIGN & STYLING
    // =====================================================================
    const colors = {
        bg: '#131314',
        panelBg: '#1e1f22',
        text: '#e3e3e3',
        inputBg: '#282a2c',
        border: '#444746',
        userBubble: '#3b4043',
        aiBubble: '#1e1f22',
        accent: '#8ab4f8'
    }

    const Spinner = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke={colors.accent} strokeWidth="4" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12" />
            </path>
        </svg>
    )

    const pulsingDotsStyle = `
        @keyframes pulse-dots {
            0% { opacity: 0.2; }
            50% { opacity: 1; }
            100% { opacity: 0.2; }
        }
        .dot-1 { animation: pulse-dots 1.4s infinite ease-in-out; animation-delay: 0s; }
        .dot-2 { animation: pulse-dots 1.4s infinite ease-in-out; animation-delay: 0.2s; }
        .dot-3 { animation: pulse-dots 1.4s infinite ease-in-out; animation-delay: 0.4s; }
    `

    return (
        <div style={{
            height: '100vh',
            boxSizing: 'border-box',
            backgroundColor: colors.bg,
            color: colors.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 20px 10px 20px'
        }}>
            <style>{pulsingDotsStyle}</style>

            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* HEADER MED LOGGA OCH TITEL */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    margin: '15px 0 25px 0',
                    borderBottom: `1px solid ${colors.border}`,
                    paddingBottom: '15px'
                }}>
                    <div style={{
                        backgroundColor: colors.panelBg,
                        padding: '8px',
                        borderRadius: '14px',
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill={colors.panelBg} stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2V8H20" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="8" y1="13" x2="16" y2="13" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                            <line x1="8" y1="17" x2="13" y2="17" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                            <circle cx="17" cy="6" r="3" fill={colors.accent}/>
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: colors.text, letterSpacing: '-0.5px' }}>
                            Smart PDF-Assistent
                        </h1>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#9aa0a6' }}>
                            AI-driven dokumentanalys (Prototyp)
                        </p>
                    </div>
                </div>

                {/* VY 1: UPPPLADDNINGSRUTA */}
                {!isDocumentReady && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{
                            backgroundColor: colors.panelBg,
                            padding: '40px',
                            borderRadius: '16px',
                            border: `1px solid ${colors.border}`,
                            textAlign: 'center',
                            width: '100%',
                            maxWidth: '550px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                        }}>
                            {isUploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                                    <div style={{ transform: 'scale(2)', marginBottom: '20px', color: colors.accent }}>
                                        <Spinner />
                                    </div>
                                    <h2 style={{ color: colors.text }}>Bearbetar dokumentet...</h2>
                                    <p style={{ color: '#9aa0a6' }}>AI:n läser in och indexerar texten.</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📂</div>
                                    <h2 style={{ marginTop: 0, marginBottom: '10px', color: colors.text }}>Välkommen</h2>
                                    <p style={{ color: '#9aa0a6', marginBottom: '30px', fontSize: '0.95rem' }}>
                                        Ladda upp en PDF för att starta konversationen och ställa frågor om innehållet.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                        <label style={{
                                            border: `2px dashed ${colors.border}`,
                                            padding: '24px',
                                            borderRadius: '12px',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            cursor: 'pointer',
                                            backgroundColor: colors.inputBg,
                                            transition: 'border-color 0.2s',
                                            display: 'block'
                                        }}>
                                            <span style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: colors.text }}>
                                                {file ? `📄 ${file.name}` : 'Klicka här för att välja PDF-fil'}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#9aa0a6' }}>
                                                {file ? 'Fil vald och redo att laddas upp' : 'Endast PDF-filer stöds'}
                                            </span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                style={{ display: 'none' }}
                                            />
                                        </label>

                                        <button
                                            onClick={uploadPDF}
                                            disabled={!file}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                backgroundColor: file ? colors.accent : colors.border,
                                                color: file ? colors.bg : '#777',
                                                border: 'none',
                                                borderRadius: '24px',
                                                cursor: file ? 'pointer' : 'not-allowed',
                                                fontWeight: 'bold',
                                                fontSize: '1rem',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            Analysera dokument
                                        </button>
                                    </div>

                                    {uploadStatus && (
                                        <div style={{ marginTop: '20px', color: colors.accent, fontSize: '0.9rem' }}>
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
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px 12px 0 0',
                            backgroundColor: colors.bg
                        }}>
                            {messages.map((msg, index) => {
                                const isLongUserMessage = msg.role === 'user' && msg.text.length > 250;

                                return (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                    }}>
                                        <div style={{
                                            maxWidth: '80%',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            backgroundColor: msg.role === 'user' ? colors.userBubble : colors.aiBubble,
                                            border: msg.role === 'ai' ? 'none' : `1px solid ${colors.border}`,
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: '1.5'
                                        }}>
                                            {msg.role === 'ai' && <strong style={{ display: 'block', marginBottom: '4px', color: colors.accent }}>Smart PDF-Assistent</strong>}

                                            {isLongUserMessage ? (
                                                <details style={{ cursor: 'pointer' }}>
                                                    <summary style={{ outline: 'none', userSelect: 'none', fontWeight: '500' }}>
                                                        <span>{msg.text.substring(0, 100)}...</span>
                                                        <span style={{ fontSize: '0.75rem', color: colors.accent, display: 'block', marginTop: '4px' }}>[ Visa hela ditt meddelande ]</span>
                                                    </summary>
                                                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                                        {msg.text}
                                                    </div>
                                                </details>
                                            ) : (
                                                <div style={{ opacity: msg.isTemp ? 0.8 : 1 }}>
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
                                                    <div style={{
                                                        marginTop: '14px',
                                                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                                        paddingTop: '10px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px'
                                                    }}>
                                                        <details style={{ fontSize: '0.75rem', cursor: 'pointer', color: '#9aa0a6' }}>
                                                            <summary style={{
                                                                outline: 'none',
                                                                userSelect: 'none',
                                                                listStyle: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                fontWeight: '500',
                                                                transition: 'color 0.2s'
                                                            }}
                                                                     onMouseOver={(e) => e.currentTarget.style.color = colors.accent}
                                                                     onMouseOut={(e) => e.currentTarget.style.color = '#9aa0a6'}
                                                            >
                                                                <span>🔍 Källor från dokumentet ({uniqueSources.length} {uniqueSources.length === 1 ? 'sida' : 'sidor'})</span>
                                                            </summary>

                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '8px',
                                                                marginTop: '10px',
                                                                textAlign: 'left',
                                                                cursor: 'default'
                                                            }}>
                                                                {uniqueSources.map((src, sIndex) => (
                                                                    <SourceCard
                                                                        key={sIndex}
                                                                        src={src}
                                                                        accentColor={colors.accent}
                                                                        borderColor={colors.border}
                                                                        textColor={colors.text}
                                                                        bg={colors.bg}
                                                                    />
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
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '20px',
                            backgroundColor: colors.panelBg,
                            border: `1px solid ${colors.border}`,
                            borderTop: 'none'
                        }}>
                            <input
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                                placeholder="Skriv din fråga här..."
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '14px 20px',
                                    borderRadius: '24px',
                                    border: 'none',
                                    backgroundColor: colors.inputBg,
                                    color: colors.text,
                                    outline: 'none'
                                }}
                                disabled={isAsking}
                            />
                            <button
                                onClick={askAI}
                                disabled={isAsking || !question.trim()}
                                style={{
                                    padding: '0 24px',
                                    backgroundColor: colors.text,
                                    color: colors.bg,
                                    border: 'none',
                                    borderRadius: '24px',
                                    cursor: (!isAsking && question.trim()) ? 'pointer' : 'not-allowed',
                                    fontWeight: 'bold',
                                    opacity: (!isAsking && question.trim()) ? 1 : 0.6
                                }}
                            >
                                Skicka
                            </button>
                        </div>

                        {/* SIDFOT MED DOKUMENTBYTE */}
                        <div style={{
                            padding: '16px 20px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ color: colors.text }}>
                                <span style={{ color: '#9aa0a6' }}>Aktuellt dokument: </span>
                                <strong>{loadedFileName}</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ color: '#9aa0a6' }}>Vill du byta?</span>

                                <input
                                    key={loadedFileName}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    style={{ color: '#9aa0a6', width: '200px' }}
                                />

                                {file && (
                                    <button
                                        onClick={uploadPDF}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: colors.accent,
                                            color: colors.bg,
                                            border: 'none',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
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