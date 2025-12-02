import { useState } from "react";
import { useAuth } from "../authContext";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Inserisci email e password");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">Interview Portal</div>
          <div className="tag">Gestisci candidati e colloqui</div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="sr-only">Login</h2>

          <label className="input-group">
            <span className="input-label">Email</span>
            <input
              type="email"
              placeholder="es. maria@azienda.it"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label className="input-group">
            <span className="input-label">Password</span>
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Verifico..." : "Accedi"}
            </button>
          </div>

          <div className="login-foot">
            <small>Non hai un account? Chiedi all'amministratore di sistema.</small>
          </div>
        </form>
      </div>
    </div>
  );
}
