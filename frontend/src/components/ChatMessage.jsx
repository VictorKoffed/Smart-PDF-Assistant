import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// =====================================================================
// COMPONENT: SOURCE REFERENCE CARD
// ---------------------------------------------------------------------
// Encapsulates the presentation of retrieved document context so users
// can verify the information behind an AI response without overwhelming
// the conversation view with long source excerpts.
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
                role="button"
                tabIndex={isLong ? 0 : undefined}
                onKeyDown={(e) => { if (isLong && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setIsExpanded(!isExpanded); } }}
                className={`source-content ${isLong ? 'expandable' : ''}`}
                title={isLong ? "Klicka för att visa/dölja hela texten" : ""}
            >
                <span className="source-text">
                    "{isExpanded || !isLong ? src.content : src.content.substring(0, 200) + '...'}"
                </span>
                {isLong && (
                    <span className="source-expand-btn">
                        {isExpanded ? '[ Fäll ihop ]' : '[ Visa hela chunk ]'}
                    </span>
                )}
            </div>
        </div>
    )
}

// =====================================================================
// COMPONENT: INDIVIDUAL CHAT MESSAGE
// ---------------------------------------------------------------------
// Represents a single user or AI message and keeps response rendering,
// source attribution, and long-message handling within the conversation
// boundary. AI responses retain their Markdown formatting so generated
// answers remain readable and consistent with the document-analysis UI.
// =====================================================================
export default function ChatMessage({ msg, isFinishedAiResponse }) {
    const isLongUserMessage = msg.role === 'user' && msg.text.length > 250;

    return (
        <div className={`message-wrapper ${msg.role}`}>
            <div className={`message-bubble ${msg.role} ${isFinishedAiResponse ? 'ai-pop-animation' : ''}`}>
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
                    <div className={msg.isThinking ? 'msg-temp' : ''}>
                        {msg.role === 'ai' ? (
                            msg.isThinking && msg.text === '' ? (
                                // Displays the waiting indicator until the first streamed token arrives,
                                // giving the user immediate feedback while the local model is processing.
                                <span className="thinking-indicator">
                                    Tänker
                                    <span className="dot-1">.</span>
                                    <span className="dot-2">.</span>
                                    <span className="dot-3">.</span>
                                </span>
                            ) : (
                                // Render Markdown as soon as streaming begins so generated answers
                                // progressively adopt the same structure as the completed response.
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            )
                        ) : (
                            // User messages remain plain text because they represent the user's
                            // original input rather than model-generated document content.
                            <span>{msg.text}</span>
                        )}
                    </div>
                )}

                {/* Display unique source pages to keep document attribution useful without
                    repeating multiple chunks from the same page in the interface. */}
                {msg.sources && msg.sources.length > 0 && !msg.isThinking && (() => {
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
    );
}
