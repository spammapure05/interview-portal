import { useState } from "react";
import { useAuth } from "../authContext";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError("Inserisci email e password");
      return;
    }
    setLoading(true);
    try {
      const result = await login(identifier, password);

      if (result?.requires2FA) {
        // Redirect to 2FA verification page
        navigate("/verify-2fa");
        return;
      }

      setLoginSuccess(true);
      // Attendi l'animazione prima di navigare
      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      setError("Credenziali non valide");
      setLoading(false);
    }
  };

  return (
    <div className={`login-bg ${loginSuccess ? "login-success" : ""}`}>
      {/* Floating particles */}
      <div className="login-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className={`login-card ${loginSuccess ? "card-success" : ""}`}>
        {/* Success checkmark overlay */}
        {loginSuccess && (
          <div className="success-overlay">
            <div className="success-checkmark">
              <svg viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <p className="success-text">Benvenuto!</p>
          </div>
        )}

        <div className={`login-content ${loginSuccess ? "content-hidden" : ""}`}>
          <div className="login-brand">
            <div className="login-icon">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="14" fill="#1e3a5f"/>
                <rect x="29" y="8" width="2.5" height="48" rx="1.25" fill="#7cb342"/>
                <text x="32" y="38" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="18" fill="#c2d4e6" letterSpacing="1">DCS</text>
              </svg>
            </div>
            <div className="login-logo">DCS Group</div>
            <div className="login-tag">Interview Portal</div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <h2 className="sr-only">Login</h2>

            <label className="input-group">
              <span className="input-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email o user id
              </span>
              <input
                type="text"
                placeholder="es. maria@azienda.it"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={loading}
                className={identifier ? "has-value" : ""}
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Password
              </span>
              <div className="password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className={password ? "has-value" : ""}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="error login-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    Accesso in corso...
                  </span>
                ) : (
                  <span className="btn-text">
                    Accedi
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                )}
              </button>
            </div>

            <div className="login-foot">
              <small>Non hai un account? Chiedi all'amministratore di sistema.</small>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
