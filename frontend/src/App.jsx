// =====================================================================
// REACT FRONTEND - MAIN COMPONENT (App.jsx)
// ---------------------------------------------------------------------
// This component coordinates the application's primary user workflow:
// - PDF upload and document readiness state.
// - Interactive chat state and streamed AI responses.
// - Session management to isolate user data on the backend.
// - Application-level scrolling behavior for the chat experience.
// =====================================================================

import { useState, useRef, useEffect } from 'react'
import Header from './components/Header'
import UploadView from './components/UploadView'
import ChatContainer from './components/ChatContainer'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

/**
 * Coordinates document upload, session state, and the document-based
 * conversation flow between the React frontend and backend.
 */
function App() {
    // STATE MANAGEMENT
    const [file, setFile] = useState(null)
    const [loadedFileName, setLoadedFileName] = useState('')
    const [uploadStatus, setUploadStatus] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isDocumentReady, setIsDocumentReady] = useState(false)

    const [question, setQuestion] = useState('')
    const [messages, setMessages] = useState([])
    const [isAsking, setIsAsking] = useState(false)

    // The session identifier provides the backend with a stable boundary for
    // document and conversation state during the lifetime of this browser session.
    const sessionIdRef = useRef(crypto.randomUUID ? crypto.randomUUID() : Date.now().toString())
    const chatContainerRef = useRef(null)
    const isScrolledUp = useRef(false)

    // Preserve the user's reading position when they inspect earlier messages
    // instead of forcing the view to the newest streamed content.
    const handleScroll = () => {
        if (!chatContainerRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
        if (scrollHeight - scrollTop - clientHeight > 50) {
            isScrolledUp.current = true
        } else {
            isScrolledUp.current = false
        }
    }

    // Keep the latest conversation visible during normal interaction while
    // respecting an explicit user decision to scroll back through the history.
    useEffect(() => {
        if (!isScrolledUp.current && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    /**
     * Captures the selected document so it can be validated and uploaded
     * as the source of truth for the subsequent document conversation.
     */
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    /**
     * Uploads the selected PDF and transitions the interface into a
     * document-ready state only after the backend has accepted the document.
     * The session header ensures the uploaded document remains isolated
     * from other application sessions.
     */
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

    /**
     * Sends the current question to the backend and incrementally incorporates
     * Server-Sent Events into the active AI message. Keeping the response
     * incremental allows the interface to provide immediate feedback while
     * the local model is still generating the answer.
     */
    const askAI = async () => {
        if (!question.trim()) return

        const currentQuestion = question

        setMessages(prev => [...prev, { role: 'user', text: currentQuestion }])
        setQuestion('')
        setIsAsking(true)

        // Create the temporary AI message before streaming starts so incoming
        // sources and tokens always have a stable message target to update.
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

            // Keep incomplete SSE frames in the buffer so a network chunk split
            // in the middle of a message cannot cause partial JSON to be parsed.
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
                                        newMessages[newMessages.length - 1] = {
                                            ...lastMsg,
                                            sources: data.sources
                                        }
                                    }
                                    return newMessages
                                })
                            } else if (data.type === 'token') {
                                setMessages(prev => {
                                    const newMessages = [...prev]
                                    const lastMsg = newMessages[newMessages.length - 1]
                                    if (lastMsg && lastMsg.role === 'ai') {
                                        newMessages[newMessages.length - 1] = {
                                            ...lastMsg,
                                            isThinking: false,
                                            text: lastMsg.text + data.content
                                        }
                                    }
                                    return newMessages
                                })
                            } else if (data.type === 'done') {
                                // Completion is handled by the surrounding stream lifecycle.
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
                    newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        isThinking: false,
                        text: errorMessage
                    }
                } else {
                    newMessages.push({ role: 'ai', text: errorMessage })
                }
                return newMessages
            })
        } finally {
            // Clear the transient asking state and finalize the temporary AI
            // message so the UI can distinguish completed responses from streaming ones.
            setIsAsking(false)
            setMessages(prev => {
                const newMessages = [...prev]
                const lastMsg = newMessages[newMessages.length - 1]
                if (lastMsg && lastMsg.role === 'ai') {
                    newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        isThinking: false
                    }
                }
                return newMessages
            })
        }
    }

    return (
        <div className="app-container">
            <div className="app-wrapper" ref={chatContainerRef} onScroll={handleScroll}>
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
