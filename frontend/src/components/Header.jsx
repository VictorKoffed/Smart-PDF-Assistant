// =====================================================================
// KOMPONENT: HEADER
// =====================================================================
export default function Header() {
    return (
        <div className="header">
            <div className="header-logo">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="var(--panel-bg)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="8" y1="13" x2="16" y2="13" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                    <line x1="8" y1="17" x2="13" y2="17" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                    <circle cx="17" cy="6" r="3" fill="var(--accent)"/>
                </svg>
            </div>
            <div>
                <h1 className="header-title">Smart PDF-Assistent</h1>
                <p className="header-subtitle">AI-driven dokumentanalys (Prototyp)</p>
            </div>
        </div>
    );
}