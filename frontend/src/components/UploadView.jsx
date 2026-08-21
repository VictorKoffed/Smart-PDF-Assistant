// =====================================================================
// KOMPONENT: UPPLADDNINGSVY
// =====================================================================
export default function UploadView({ file, isUploading, uploadStatus, handleFileChange, uploadPDF }) {
    const Spinner = () => (
        <svg className="spinner-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12" />
            </path>
        </svg>
    )

    return (
        <div className="upload-container">
            <div className="upload-card">
                {isUploading ? (
                    <div className="uploading-state">
                        <div className="spinner-container">
                            <Spinner />
                        </div>
                        <h2 className="uploading-title">Bearbetar dokumentet...</h2>
                        <p className="uploading-desc">AI:n läser in och indexerar texten.</p>
                    </div>
                ) : (
                    <>
                        <div className="upload-icon">📂</div>
                        <h2 className="upload-title">Välkommen</h2>
                        <p className="upload-desc">Ladda upp en PDF för att starta konversationen och ställa frågor om innehållet.</p>

                        <div className="upload-actions">
                            <label className="upload-label">
                                <span className="upload-file-name">
                                    {file ? `📄 ${file.name}` : 'Klicka här för att välja PDF-fil'}
                                </span>
                                <span className="upload-file-hint">
                                    {file ? 'Fil vald och redo att laddas upp' : 'Endast PDF-filer stöds'}
                                </span>
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden-file-input" />
                            </label>

                            <button
                                onClick={uploadPDF}
                                disabled={!file}
                                className={`upload-btn ${file ? 'active' : 'disabled'}`}
                            >
                                Analysera dokument
                            </button>
                        </div>

                        {uploadStatus && (
                            <div className="upload-status-msg">
                                {uploadStatus}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}