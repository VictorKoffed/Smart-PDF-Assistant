// =====================================================================
// REACT FRONTEND - HUVUDKOMPONENT (App.jsx)
// ---------------------------------------------------------------------
// Denna fil hanterar hela gränssnittet för Smart PDF-Assistent:
// - Uppladdningsvy för PDF-filer.
// - Interaktiv chattvy med meddelandehantering och Markdown-stöd.
// - Sessionshantering för att isolera användardata mot backend.
// - Starta miljö: npm run dev -- --host
// =====================================================================

import { useState, useRef } from 'react'
import Header from './components/Header'
import UploadView from './components/UploadView'
import ChatContainer from './components/ChatContainer'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

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

    const sessionIdRef = useRef(crypto.randomUUID ? crypto.randomUUID() : Date.now().toString())

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
            text: '',
            sources: [],
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

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Kommunikationsfel mot servern' }))
                throw new Error(errData.detail || 'Kommunikationsfel mot servern')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop()

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmed.substring(6)
                            const data = JSON.parse(jsonStr)

                            if (data.type === 'sources') {
                                setMessages(prev => {
                                    const newMessages = [...prev]
                                    const lastMsg = newMessages[newMessages.length - 1]
                                    if (lastMsg && lastMsg.role === 'ai') {
                                        lastMsg.sources = data.sources
                                    }
                                    return newMessages
                                })
                            } else if (data.type === 'token') {
                                setMessages(prev => {
                                    const newMessages = [...prev]
                                    const lastMsg = newMessages[newMessages.length - 1]
                                    if (lastMsg && lastMsg.role === 'ai') {
                                        lastMsg.isThinking = false
                                        lastMsg.text += data.content
                                    }
                                    return newMessages
                                })
                            } else if (data.type === 'done') {
                                // Klar
                            }
                        } catch (e) {
                            console.error('Kunde inte parsea SSE JSON', e)
                        }
                    }
                }
            }

        } catch (error) {
            const errorMessage = `❌ ${error.message || 'Kunde inte nå servern eller så avbröts anropet.'}`
            setMessages(prev => {
                const newMessages = [...prev]
                const lastMsg = newMessages[newMessages.length - 1]
                if (lastMsg && lastMsg.role === 'ai') {
                    lastMsg.isThinking = false
                    lastMsg.text = errorMessage
                } else {
                    newMessages.push({ role: 'ai', text: errorMessage })
                }
                return newMessages
            })
        } finally {
            setIsAsking(false)
            setMessages(prev => {
                const newMessages = [...prev]
                const lastMsg = newMessages[newMessages.length - 1]
                if (lastMsg && lastMsg.role === 'ai') {
                    lastMsg.isThinking = false
                }
                return newMessages
            })
        }
    }

    return (
        <div className="app-container">
            <div className="app-wrapper">
                <Header />

                {!isDocumentReady && (
                    <UploadView
                        file={file}
                        isUploading={isUploading}
                        uploadStatus={uploadStatus}
                        handleFileChange={handleFileChange}
                        uploadPDF={uploadPDF}
                    />
                )}

                {isDocumentReady && (
                    <ChatContainer
                        messages={messages}
                        question={question}
                        setQuestion={setQuestion}
                        askAI={askAI}
                        isAsking={isAsking}
                        loadedFileName={loadedFileName}
                        file={file}
                        handleFileChange={handleFileChange}
                        uploadPDF={uploadPDF}
                    />
                )}
            </div>
        </div>
    )
}

export default App
