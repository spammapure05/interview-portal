import { useEffect, useState } from "react";
import api from "../api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("secretary");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Errore caricamento utenti", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setRole("secretary");
    setError("");
    setEditUser(null);
    setShowForm(false);
    setShowPassword(false);
    setGeneratedPassword("");
  };

  // Genera password sicura
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let newPassword = "";

    // Assicura almeno una maiuscola, una minuscola, un numero e un carattere speciale
    newPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    newPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    newPassword += "0123456789"[Math.floor(Math.random() * 10)];
    newPassword += "!@#$%&*"[Math.floor(Math.random() * 7)];

    // Completa con caratteri casuali
    for (let i = 4; i < length; i++) {
      newPassword += charset[Math.floor(Math.random() * charset.length)];
    }

    // Mescola la password
    newPassword = newPassword.split("").sort(() => Math.random() - 0.5).join("");

    setPassword(newPassword);
    setGeneratedPassword(newPassword);
    setShowPassword(true);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
  };

  const openEditForm = (user) => {
    setEditUser(user);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setError("");
    setShowForm(true);
    setShowPassword(false);
    setGeneratedPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      if (editUser) {
        // Update
        await api.put(`/users/${editUser.id}`, {
          email,
          password: password || undefined,
          role
        });
      } else {
        // Create
        if (!password) {
          setError("La password è obbligatoria per i nuovi utenti");
          setFormLoading(false);
          return;
        }
        await api.post("/users", { email, password, role });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Errore nel salvataggio");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Gestione Utenti</h1>
            <p className="page-subtitle-modern">Crea e gestisci gli account degli utenti</p>
          </div>
        </div>
        <button className="btn-primary-modern" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuovo Utente
        </button>
      </div>

      <div className="users-page-content">
        {loading ? (
          <div className="loading-state">Caricamento utenti...</div>
        ) : users.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <h3>Nessun utente</h3>
            <p>Non ci sono utenti registrati.</p>
          </div>
        ) : (
          <div className="users-list">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-avatar">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-email">{user.email}</span>
                  <span className={`user-role-badge role-${user.role}`}>
                    {user.role === "admin" ? "Amministratore" : user.role === "viewer" ? "Visualizzatore" : "Segreteria"}
                  </span>
                </div>
                <div className="user-actions">
                  <button className="btn-icon" title="Modifica" onClick={() => openEditForm(user)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon btn-danger-icon" title="Elimina" onClick={() => setDeleteConfirm(user)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editUser ? "Modifica Utente" : "Nuovo Utente"}</h2>
              <button className="modal-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modern-form">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Email *
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Password {editUser ? "(lascia vuoto per non modificare)" : "*"}
                </label>
                <div className="password-input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (e.target.value !== generatedPassword) {
                        setGeneratedPassword("");
                      }
                    }}
                    required={!editUser}
                    disabled={formLoading}
                    placeholder={editUser ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    className="btn-icon password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Nascondi password" : "Mostra password"}
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
                  {!editUser && (
                    <button
                      type="button"
                      className="btn-generate-password"
                      onClick={generatePassword}
                      disabled={formLoading}
                      title="Genera password automatica"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                      </svg>
                      Genera
                    </button>
                  )}
                </div>
                {generatedPassword && (
                  <div className="generated-password-box">
                    <span className="generated-label">Password generata:</span>
                    <code className="generated-value">{generatedPassword}</code>
                    <button
                      type="button"
                      className="btn-copy"
                      onClick={copyPassword}
                      title="Copia negli appunti"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                    <p className="password-hint">Copia questa password prima di salvare. Non sara piu visibile.</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <path d="M20 8v6"/>
                    <path d="M23 11h-6"/>
                  </svg>
                  Ruolo *
                </label>
                <select
                  className="form-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={formLoading}
                >
                  <option value="secretary">Segreteria</option>
                  <option value="viewer">Visualizzatore</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              <div className="form-actions-row">
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Salvataggio..." : (editUser ? "Aggiorna" : "Crea Utente")}
                </button>
                <button type="button" className="btn-cancel" onClick={resetForm} disabled={formLoading}>
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Conferma Eliminazione</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Sei sicuro di voler eliminare l'utente <strong>{deleteConfirm.email}</strong>?</p>
              <p className="text-muted">Questa azione non può essere annullata.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Annulla
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
