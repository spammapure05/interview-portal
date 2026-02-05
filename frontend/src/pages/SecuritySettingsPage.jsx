import { useState, useEffect } from "react";
import api from "../api";
import TwoFactorSetupModal from "../components/TwoFactorSetupModal";

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState(null);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [statusRes, devicesRes] = await Promise.all([
        api.get("/2fa/status"),
        api.get("/2fa/trusted-devices")
      ]);
      setStatus(statusRes.data);
      setTrustedDevices(devicesRes.data);
    } catch (err) {
      console.error("Error loading 2FA data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setError("");
    setActionLoading(true);

    try {
      await api.post("/2fa/disable", disableForm);
      setSuccess("2FA disattivata con successo");
      setShowDisableModal(false);
      setDisableForm({ password: "", code: "" });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la disattivazione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    setError("");
    setActionLoading(true);

    try {
      const res = await api.post("/2fa/regenerate-backup-codes", { password: regeneratePassword });
      setBackupCodes(res.data.backupCodes);
      setRegeneratePassword("");
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la rigenerazione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    try {
      await api.delete(`/2fa/trusted-devices/${deviceId}`);
      setTrustedDevices(trustedDevices.filter(d => d.id !== deviceId));
      setSuccess("Dispositivo rimosso");
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la rimozione");
    }
  };

  const handleSetupComplete = (codes) => {
    setBackupCodes(codes);
    setShowSetupModal(false);
    setShowBackupCodesModal(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Sicurezza
          </h1>
          <p className="page-subtitle">Gestisci l'autenticazione a due fattori e i dispositivi fidati</p>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          {success}
          <button className="alert-close" onClick={() => setSuccess("")}>&times;</button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
          {error}
          <button className="alert-close" onClick={() => setError("")}>&times;</button>
        </div>
      )}

      {/* 2FA Section */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h2>Autenticazione a Due Fattori (2FA)</h2>
            <p>Aggiungi un livello extra di sicurezza al tuo account</p>
          </div>
          <div className={`status-badge-modern ${status?.enabled ? "status-completed" : "status-pending"}`}>
            {status?.enabled ? "Attiva" : "Non attiva"}
          </div>
        </div>

        <div className="settings-card-content">
          {status?.enabled ? (
            <>
              <div className="twofa-info">
                <div className="twofa-info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>2FA attiva sul tuo account</span>
                </div>
                <div className="twofa-info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{status.backupCodesCount} codici di backup rimanenti</span>
                </div>
              </div>

              <div className="twofa-actions-grid">
                <button
                  className="btn-secondary"
                  onClick={() => setShowBackupCodesModal(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Rigenera codici di backup
                </button>

                <button
                  className="btn-danger-outline"
                  onClick={() => setShowDisableModal(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Disattiva 2FA
                </button>
              </div>
            </>
          ) : (
            <div className="twofa-setup-prompt">
              <p>
                L'autenticazione a due fattori aggiunge un ulteriore livello di sicurezza richiedendo
                un codice generato dalla tua app di autenticazione oltre alla password.
              </p>
              <button
                className="btn-primary-modern"
                onClick={() => setShowSetupModal(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Attiva 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trusted Devices Section */}
      <div className="settings-card" style={{ marginTop: "1.5rem" }}>
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <h2>Dispositivi Fidati</h2>
            <p>Dispositivi su cui non viene richiesta la 2FA</p>
          </div>
          <span className="badge">{trustedDevices.length}</span>
        </div>

        <div className="settings-card-content">
          {trustedDevices.length === 0 ? (
            <div className="empty-state-compact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <p>Nessun dispositivo fidato registrato</p>
            </div>
          ) : (
            <div className="trusted-devices-list">
              {trustedDevices.map(device => (
                <div key={device.id} className="trusted-device-item">
                  <div className="trusted-device-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div className="trusted-device-info">
                    <span className="trusted-device-name">{device.device_name || "Dispositivo"}</span>
                    <span className="trusted-device-date">
                      Aggiunto il {new Date(device.created_at).toLocaleDateString("it-IT")} •
                      Scade il {new Date(device.expires_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  <button
                    className="btn-icon-small btn-danger-icon"
                    onClick={() => handleRemoveDevice(device.id)}
                    title="Rimuovi dispositivo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <TwoFactorSetupModal
          onClose={() => setShowSetupModal(false)}
          onComplete={handleSetupComplete}
        />
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => setShowDisableModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Disattiva 2FA</h2>
              <button className="modal-close" onClick={() => setShowDisableModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleDisable2FA}>
              <div className="modal-body">
                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  Per disattivare la 2FA, inserisci la tua password e un codice dalla tua app di autenticazione.
                </p>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={disableForm.password}
                    onChange={e => setDisableForm({ ...disableForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Codice 2FA</label>
                  <input
                    type="text"
                    className="form-input"
                    value={disableForm.code}
                    onChange={e => setDisableForm({ ...disableForm, code: e.target.value })}
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDisableModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn-danger" disabled={actionLoading}>
                  {actionLoading ? "Disattivazione..." : "Disattiva 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <div className="modal-overlay" onClick={() => { setShowBackupCodesModal(false); setBackupCodes([]); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Codici di Backup</h2>
              <button className="modal-close" onClick={() => { setShowBackupCodesModal(false); setBackupCodes([]); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {backupCodes.length > 0 ? (
                <>
                  <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>
                    <strong>Importante:</strong> Salva questi codici in un luogo sicuro. Ogni codice può essere usato una sola volta.
                  </div>
                  <div className="backup-codes-grid">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="backup-code-item">{code}</div>
                    ))}
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ marginTop: "1rem", width: "100%" }}
                    onClick={() => {
                      navigator.clipboard.writeText(backupCodes.join("\n"));
                      setSuccess("Codici copiati negli appunti");
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: 8 }}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copia tutti i codici
                  </button>
                </>
              ) : (
                <form onSubmit={handleRegenerateBackupCodes}>
                  <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                    Per generare nuovi codici di backup, inserisci la tua password. I vecchi codici verranno invalidati.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={regeneratePassword}
                      onChange={e => setRegeneratePassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={actionLoading} style={{ width: "100%" }}>
                    {actionLoading ? "Generazione..." : "Genera nuovi codici"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
