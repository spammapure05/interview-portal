import { useState, useEffect } from "react";
import api from "../api";

const TEMPLATE_INFO = {
  interview_reminder: {
    name: "Promemoria Colloquio",
    description: "Inviato prima di un colloquio programmato",
    variables: ["{{candidate_name}}", "{{date}}", "{{time}}", "{{location}}", "{{status}}"]
  },
  meeting_reminder: {
    name: "Promemoria Riunione",
    description: "Inviato prima di una riunione in sala",
    variables: ["{{meeting_title}}", "{{room_name}}", "{{date}}", "{{start_time}}", "{{end_time}}", "{{description}}", "{{organizer}}"]
  },
  vehicle_reminder: {
    name: "Promemoria Veicolo",
    description: "Inviato prima di una prenotazione veicolo",
    variables: ["{{plate}}", "{{brand}}", "{{model}}", "{{driver_name}}", "{{date}}", "{{time}}", "{{destination}}"]
  }
};

export default function NotificationSettingsPage() {
  const [activeTab, setActiveTab] = useState("smtp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  // SMTP State
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    from_email: "",
    from_name: "Interview Portal",
    enabled: false
  });
  const [testEmail, setTestEmail] = useState("");

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [smtpRes, templatesRes] = await Promise.all([
        api.get("/settings/smtp"),
        api.get("/settings/templates")
      ]);
      setSmtpConfig(smtpRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      console.error("Errore caricamento impostazioni", err);
      setMessage({ type: "error", text: "Errore caricamento impostazioni" });
    } finally {
      setLoading(false);
    }
  };

  const handleSmtpChange = (field, value) => {
    setSmtpConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveSmtpConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/settings/smtp", smtpConfig);
      setMessage({ type: "success", text: "Configurazione SMTP salvata" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Errore salvataggio" });
    } finally {
      setSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    if (!testEmail) {
      setMessage({ type: "error", text: "Inserisci un indirizzo email per il test" });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      await api.post("/settings/smtp/test", { test_email: testEmail });
      setMessage({ type: "success", text: "Email di test inviata con successo!" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Errore invio test" });
    } finally {
      setTesting(false);
    }
  };

  const handleTemplateEdit = (template) => {
    setEditingTemplate({ ...template });
  };

  const handleTemplateChange = (field, value) => {
    setEditingTemplate(prev => ({ ...prev, [field]: value }));
  };

  const saveTemplate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/settings/templates/${editingTemplate.type}`, editingTemplate);
      setTemplates(prev => prev.map(t => t.type === editingTemplate.type ? editingTemplate : t));
      setEditingTemplate(null);
      setMessage({ type: "success", text: "Template salvato" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Errore salvataggio" });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    if (!editingTemplate) return;
    const textarea = document.getElementById("template-body");
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editingTemplate.body;
      const newText = text.substring(0, start) + variable + text.substring(end);
      handleTemplateChange("body", newText);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento impostazioni...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Impostazioni Notifiche</h1>
            <p className="page-subtitle-modern">Configura SMTP e personalizza i template email</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button className="alert-close" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === "smtp" ? "active" : ""}`}
          onClick={() => setActiveTab("smtp")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Configurazione SMTP
        </button>
        <button
          className={`settings-tab ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Template Notifiche
        </button>
      </div>

      {/* SMTP Tab */}
      {activeTab === "smtp" && (
        <div className="settings-card">
          <div className="settings-card-header">
            <h2>Server SMTP</h2>
            <p>Configura il server di posta per l'invio delle notifiche</p>
          </div>

          <div className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>Host SMTP *</label>
                <input
                  type="text"
                  value={smtpConfig.host}
                  onChange={(e) => handleSmtpChange("host", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="form-group form-group-small">
                <label>Porta</label>
                <input
                  type="number"
                  value={smtpConfig.port}
                  onChange={(e) => handleSmtpChange("port", parseInt(e.target.value))}
                />
              </div>
              <div className="form-group form-group-small">
                <label>SSL/TLS</label>
                <div className="toggle-wrapper">
                  <button
                    className={`toggle-btn ${smtpConfig.secure ? "active" : ""}`}
                    onClick={() => handleSmtpChange("secure", !smtpConfig.secure)}
                  >
                    {smtpConfig.secure ? "Si" : "No"}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={smtpConfig.username}
                  onChange={(e) => handleSmtpChange("username", e.target.value)}
                  placeholder="utente@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={smtpConfig.password}
                  onChange={(e) => handleSmtpChange("password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email Mittente *</label>
                <input
                  type="email"
                  value={smtpConfig.from_email}
                  onChange={(e) => handleSmtpChange("from_email", e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>
              <div className="form-group">
                <label>Nome Mittente</label>
                <input
                  type="text"
                  value={smtpConfig.from_name}
                  onChange={(e) => handleSmtpChange("from_name", e.target.value)}
                  placeholder="Interview Portal"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={smtpConfig.enabled}
                    onChange={(e) => handleSmtpChange("enabled", e.target.checked)}
                  />
                  <span>Abilita invio notifiche email</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={saveSmtpConfig} disabled={saving}>
                {saving ? "Salvataggio..." : "Salva Configurazione"}
              </button>
            </div>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-card-header">
            <h2>Test Connessione</h2>
            <p>Verifica che la configurazione SMTP funzioni correttamente</p>
          </div>

          <div className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>Email di test</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div className="form-group form-group-btn">
                <button className="btn-secondary" onClick={testSmtpConnection} disabled={testing}>
                  {testing ? "Invio in corso..." : "Invia Email di Test"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && !editingTemplate && (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.type} className={`template-card ${!template.enabled ? "disabled" : ""}`}>
              <div className="template-header">
                <div className="template-icon">
                  {template.type === "interview_reminder" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                  {template.type === "meeting_reminder" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  )}
                  {template.type === "vehicle_reminder" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                    </svg>
                  )}
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{TEMPLATE_INFO[template.type]?.description}</p>
                </div>
                <span className={`template-status ${template.enabled ? "active" : "inactive"}`}>
                  {template.enabled ? "Attivo" : "Disattivato"}
                </span>
              </div>
              <div className="template-preview">
                <div className="preview-label">Oggetto:</div>
                <div className="preview-text">{template.subject}</div>
              </div>
              <div className="template-meta">
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {template.hours_before}h prima
                </span>
              </div>
              <div className="template-actions">
                <button className="btn-edit" onClick={() => handleTemplateEdit(template)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Modifica Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor */}
      {activeTab === "templates" && editingTemplate && (
        <div className="template-editor">
          <div className="editor-header">
            <button className="btn-back" onClick={() => setEditingTemplate(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Torna alla lista
            </button>
            <h2>Modifica: {editingTemplate.name}</h2>
          </div>

          <div className="editor-content">
            <div className="editor-main">
              <div className="form-group">
                <label>Nome Template</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => handleTemplateChange("name", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Oggetto Email</label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => handleTemplateChange("subject", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Corpo Email (HTML)</label>
                <textarea
                  id="template-body"
                  value={editingTemplate.body}
                  onChange={(e) => handleTemplateChange("body", e.target.value)}
                  rows={15}
                />
              </div>

              <div className="form-row">
                <div className="form-group form-group-small">
                  <label>Ore prima dell'evento</label>
                  <input
                    type="number"
                    value={editingTemplate.hours_before}
                    onChange={(e) => handleTemplateChange("hours_before", parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingTemplate.enabled}
                      onChange={(e) => handleTemplateChange("enabled", e.target.checked)}
                    />
                    <span>Template attivo</span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setEditingTemplate(null)}>
                  Annulla
                </button>
                <button className="btn-primary" onClick={saveTemplate} disabled={saving}>
                  {saving ? "Salvataggio..." : "Salva Template"}
                </button>
              </div>
            </div>

            <div className="editor-sidebar">
              <div className="variables-panel">
                <h3>Variabili Disponibili</h3>
                <p>Clicca per inserire nel corpo email</p>
                <div className="variables-list">
                  {TEMPLATE_INFO[editingTemplate.type]?.variables.map(v => (
                    <button
                      key={v}
                      className="variable-btn"
                      onClick={() => insertVariable(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preview-panel">
                <h3>Anteprima</h3>
                <div
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: editingTemplate.body }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
