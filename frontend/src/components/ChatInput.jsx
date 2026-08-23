import { useRef, useEffect } from 'react';

// =====================================================================
// KOMPONENT: CHAT INPUT (Inmatningsfält för meddelanden)
// ---------------------------------------------------------------------
// Ansvarar för att hantera användarens textinmatning. Den ersätter en
// vanlig enkelrads-input med en dynamisk textarea för att ge en modern
// chattupplevelse där gränssnittet växer när texten blir längre.
// =====================================================================
export default function ChatInput({ question, setQuestion, askAI, isAsking }) {
    const textareaRef = useRef(null);

    // UX: Synkroniserar textarean höjd dynamiskt baserat på innehållet.
    // Vi nollställer först höjden för att korrekt kunna beräkna textens scrollHeight.
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [question]);

    // UX: Tillåter Shift+Enter för radbrytningar men skickar direkt vid vanlig Enter.
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
                placeholder="Ställ en fråga om dokumentet..."
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
                Skicka
            </button>
        </div>
    );
}