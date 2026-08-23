import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// =====================================================================
// KOMPONENT: CHAT CONTAINER (Konversationsvy)
// ---------------------------------------------------------------------
// Huvudbehållare för själva chatten. Hanterar den automatiska scroll-logiken
// (så att användaren inte fastnar längst ner om de scrollar upp för att läsa
// historik) samt integrerar inmatning och dokumentbyten i sidfoten.
// =====================================================================
export default function ChatContainer({
                                          messages, question, setQuestion, askAI, isAsking,
                                          loadedFileName, file, handleFileChange, uploadPDF
                                      }) {
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const isScrolledUp = useRef(false);

    // UX: Identifierar om användaren har scrollat upp i historiken för att
    // undvika att tvinga ner dem till botten mitt i läsningen när nya tokens strömmar in.
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

        if (scrollHeight - scrollTop - clientHeight > 100) {
            isScrolledUp.current = true;
        } else {
            isScrolledUp.current = false;
        }
    };

    // Auto-scrolla till botten vid nya meddelanden (förutsatt att man inte läser historik)
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
                    // REACT RECONCILIATION: Genom att dynamiskt styra nyckeln triggar vi
                    // en ren omrendering när AI:n går från "Tänker..." till färdigt svar,
                    // vilket krävs för att köra CSS-pop-animationen snyggt.
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

            {/* Sidfot som visar aktiv kontext och ger möjlighet att byta dokument */}
            <div className="footer">
                <div>
                    <span className="footer-hint">Aktuellt dokument: </span>
                    <strong>{loadedFileName}</strong>
                </div>

                <div className="footer-actions">
                    <span className="footer-hint">Vill du byta?</span>
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