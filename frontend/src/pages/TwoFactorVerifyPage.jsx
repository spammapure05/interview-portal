import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";

export default function TwoFactorVerifyPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { verify2FA, tempToken, logout } = useAuth();

  useEffect(() => {
    // If no tempToken, redirect to login
    if (!tempToken) {
      navigate("/login");
    }
  }, [tempToken, navigate]);

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every(d => d !== "") && newCode.join("").length === 6) {
      handleSubmit(null, newCode.join(""));
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
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      handleSubmit(null, pastedData);
    }
  };

  const handleSubmit = async (e, codeValue = null) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const finalCode = codeValue || (useBackupCode ? backupCode : code.join(""));

    if (!finalCode || (useBackupCode ? finalCode.length < 8 : finalCode.length !== 6)) {
      setError(useBackupCode ? "Inserisci il codice di backup completo" : "Inserisci il codice a 6 cifre");
      setLoading(false);
      return;
    }

    try {
      await verify2FA(finalCode, trustDevice);
      navigate("/");
    } catch (err) {
      setError(err.message || "Codice non valido");
      if (!useBackupCode) {
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="login-page">
      <div className="login-card twofa-card">
        <div className="login-header">
          <div className="login-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
          <h1 className="login-title">Verifica 2FA</h1>
          <p className="login-subtitle">
            {useBackupCode
              ? "Inserisci uno dei tuoi codici di backup"
              : "Inserisci il codice dalla tua app di autenticazione"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {useBackupCode ? (
            <div className="form-group">
              <label className="form-label">Codice di backup</label>
              <input
                type="text"
                className="form-input backup-code-input"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                maxLength={9}
                autoFocus
              />
            </div>
          ) : (
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
          )}

          <label className="checkbox-label trust-device-label">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
            <span>Ricorda questo dispositivo per 30 giorni</span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Verifica in corso..." : "Verifica"}
          </button>

          <div className="twofa-actions">
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setError("");
                setBackupCode("");
                setCode(["", "", "", "", "", ""]);
              }}
            >
              {useBackupCode ? "Usa codice app" : "Usa codice di backup"}
            </button>

            <button
              type="button"
              className="btn-link btn-link-danger"
              onClick={handleCancel}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
