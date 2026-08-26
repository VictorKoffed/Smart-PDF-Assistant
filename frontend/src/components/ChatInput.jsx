import { useRef, useEffect } from 'react';

// =====================================================================
// COMPONENT: CHAT INPUT (Message Input Field)
// ---------------------------------------------------------------------
// Handles user text input for the conversation. A dynamically sized
// textarea is used instead of a single-line input to provide a more
// natural chat experience as the user's message grows.
// =====================================================================
export default function ChatInput({ question, setQuestion, askAI, isAsking }) {
    const textareaRef = useRef(null);

    // UX: Adjust the textarea height to match its content while keeping
    // a maximum height so long messages do not consume excessive space.
    // Resetting the height first ensures scrollHeight reflects the content
    // rather than the textarea's previously calculated height.
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [question]);

    // UX: Preserve Shift+Enter for intentional line breaks while using
    // a regular Enter press as the primary shortcut for submitting a question.
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askAI();
        }
    };

    return (
        <div className="input-container">
            <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about the document..."
                rows={1}
                autoFocus
                className="chat-input"
                disabled={isAsking}
            />
            <button
                onClick={askAI}
                disabled={isAsking || !question.trim()}
                className="send-btn"
            >
                Send
            </button>
        </div>
    );
}
