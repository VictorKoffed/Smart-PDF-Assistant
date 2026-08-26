import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// =====================================================================
// COMPONENT: CHAT CONTAINER (Conversation View)
// ---------------------------------------------------------------------
// Main container for the chat interface. It manages scroll behavior so
// users can review earlier messages without being forced back to the
// latest response, while also integrating question input and document
// replacement controls into the chat layout.
// =====================================================================
export default function ChatContainer({
                                          messages, question, setQuestion, askAI, isAsking,
                                          loadedFileName, file, handleFileChange, uploadPDF
                                      }) {
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const isScrolledUp = useRef(false);

    // UX: Track whether the user has moved away from the latest messages.
    // This prevents incoming streamed AI tokens from repeatedly moving the
    // viewport while the user is intentionally reading earlier conversation history.
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

        if (scrollHeight - scrollTop - clientHeight > 100) {
            isScrolledUp.current = true;
        } else {
            isScrolledUp.current = false;
        }
    };

    // Keep the conversation anchored to the latest message during normal use,
    // while respecting the user's position when they have intentionally scrolled
    // back through the conversation history.
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
                    // REACT RECONCILIATION: Dynamically changing the key forces
                    // React to treat the transition from the temporary "Thinking..."
                    // state to the completed AI response as a new element. This allows
                    // the CSS pop animation to play when the final response appears.
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

            {/* Footer showing the active document and providing a way to replace it. */}
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
