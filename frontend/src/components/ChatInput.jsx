// =====================================================================
// KOMPONENT: INMATNINGSFÄLT
// =====================================================================
export default function ChatInput({ question, setQuestion, askAI, isAsking }) {
    return (
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
    );
}