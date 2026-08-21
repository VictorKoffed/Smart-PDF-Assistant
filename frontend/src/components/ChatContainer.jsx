import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// =====================================================================
// KOMPONENT: CHATT-BEHÅLLARE & SIDFOT
// =====================================================================
export default function ChatContainer({
                                          messages, question, setQuestion, askAI, isAsking,
                                          loadedFileName, file, handleFileChange, uploadPDF
                                      }) {
    const chatEndRef = useRef(null);

    const chatContainerRef = useRef(null);
    const isScrolledUp = useRef(false);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

        if (scrollHeight - scrollTop - clientHeight > 100) {
            isScrolledUp.current = true;
        } else {
            isScrolledUp.current = false;
        }
    };

    useEffect(() => {
        if (!isScrolledUp.current) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <>
            <div
                className="chat-container"
                ref={chatContainerRef}
                onScroll={handleScroll}
            >
                {messages.map((msg, index) => {
                    // =====================================================================
                    // ANIMATIONS-LOGIK (React Reconciliation)
                    // ---------------------------------------------------------------------
                    // Genom att dynamiskt byta 'key' när meddelandet går från temporärt
                    // ("Tänker...") Till färdigt svar, tvingar vi React att radera den gamla
                    // bubblan och rendera en helt ny. Detta gör att CSS-animationen spelas upp!
                    // =====================================================================
                    const messageKey = msg.isTemp ? `temp-${index}` : `msg-${index}`;
                    const isFinishedAiResponse = msg.role === 'ai' && !msg.isTemp;

                    return (
                        <ChatMessage
                            key={messageKey}
                            msg={msg}
                            isFinishedAiResponse={isFinishedAiResponse}
                        />
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            <ChatInput
                question={question}
                setQuestion={setQuestion}
                askAI={askAI}
                isAsking={isAsking}
            />

            {/* SIDFOT MED DOKUMENTBYTE */}
            <div className="footer">
                <div>
                    <span className="footer-hint">Aktuellt dokument: </span>
                    <strong>{loadedFileName}</strong>
                </div>

                <div className="footer-actions">
                    <span className="footer-hint">Vill du byta?</span>
                    {/* =====================================================================
                        UX-FÖRBÄTTRING: Anpassad filväljare
                        ---------------------------------------------------------------------
                        Vi döljer webbläsarens standardknapp och använder en label som
                        fungerar som en klickbar länk istället för ett mycket renare UI.
                    ===================================================================== */}
                    <label className="footer-file-label">
                        <span className="footer-file-custom-btn">📁 Välj ny fil</span>
                        <input
                            key={loadedFileName}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {file && (
                        <button onClick={uploadPDF} className="change-doc-btn">
                            Analysera nytt dokument
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}