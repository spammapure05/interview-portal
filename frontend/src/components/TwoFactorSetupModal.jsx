import { useState, useRef } from "react";
import api from "../api";

export default function TwoFactorSetupModal({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const startSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/2fa/setup");
      setSetupData(res.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la configurazione");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      if (pastedData.length < 6) {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const verifyCode = async () => {
    const codeStr = code.join("");
    if (codeStr.length !== 6) {
      setError("Inserisci il codice a 6 cifre");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/2fa/enable", {
        code: codeStr,
        secret: setupData.secret
      });
      onComplete(res.data.backupCodes);
    } catch (err) {
      setError(err.response?.data?.message || "Codice non valido");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-2fa-setup" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configura 2FA</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="setup-steps">
          <div className={`setup-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            <span className="step-number">1</span>
            <span className="step-label">Introduzione</span>
          </div>
          <div className="step-connector"></div>
          <div className={`setup-step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            <span className="step-number">2</span>
            <span className="step-label">Scansiona QR</span>
          </div>
          <div className="step-connector"></div>
          <div className={`setup-step ${step >= 3 ? "active" : ""}`}>
            <span className="step-number">3</span>
            <span className="step-label">Verifica</span>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="setup-intro">
              <div className="setup-intro-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h3>Proteggi il tuo account</h3>
              <p>
                L'autenticazione a due fattori aggiunge un ulteriore livello di sicurezza.
                Avrai bisogno di un'app di autenticazione come:
              </p>
              <ul className="auth-apps-list">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy</li>
              </ul>
              <button
                className="btn-primary"
                onClick={startSetup}
                disabled={loading}
                style={{ width: "100%", marginTop: "1rem" }}
              >
                {loading ? "Preparazione..." : "Inizia configurazione"}
              </button>
            </div>
          )}

          {step === 2 && setupData && (
            <div className="setup-qr">
              <p style={{ textAlign: "center", marginBottom: "1rem", color: "var(--text-secondary)" }}>
                Scansiona questo codice QR con la tua app di autenticazione
              </p>

              <div className="qr-code-container">
                <img src={setupData.qrCode} alt="QR Code" className="qr-code-image" />
              </div>

              <div className="manual-entry">
                <p>Oppure inserisci manualmente questo codice:</p>
                <div className="manual-code">
                  <code>{setupData.manualEntry}</code>
                  <button
                    className="btn-icon-small"
                    onClick={() => copyToClipboard(setupData.manualEntry)}
                    title="Copia codice"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => setStep(3)}
                style={{ width: "100%", marginTop: "1.5rem" }}
              >
                Ho scansionato il codice
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="setup-verify">
              <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
                Inserisci il codice a 6 cifre dalla tua app di autenticazione per confermare la configurazione
              </p>

              <div className="totp-code-inputs" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="totp-digit-input"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                className="btn-primary"
                onClick={verifyCode}
                disabled={loading || code.join("").length !== 6}
                style={{ width: "100%", marginTop: "1.5rem" }}
              >
                {loading ? "Verifica in corso..." : "Attiva 2FA"}
              </button>

              <button
                className="btn-link"
                onClick={() => setStep(2)}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                Torna indietro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
