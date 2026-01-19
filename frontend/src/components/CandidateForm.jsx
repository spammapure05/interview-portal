import { useState, useEffect } from "react";
import api from "../api";
import PhoneInput from "./PhoneInput";

export default function CandidateForm({ candidate, onSaved }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFirstName(candidate.first_name || "");
      setLastName(candidate.last_name || "");
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");
      setNotes(candidate.notes || "");
    }
  }, [candidate]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    setLoading(true);
    try {
      if (candidate && candidate.id) {
        await api.put(`/candidates/${candidate.id}`, {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          notes
        });
      } else {
        await api.post("/candidates", {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          notes
        });
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setNotes("");
      }
      onSaved && onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-card-header">
        <div className="form-icon">
          {candidate ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          )}
        </div>
        <h2>{candidate ? "Modifica Candidato" : "Nuovo Candidato"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Nome <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Inserisci nome"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Cognome <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Inserisci cognome"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Email
          </label>
          <input
            type="email"
            className="form-input"
            placeholder="esempio@azienda.it"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Telefono
          </label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            disabled={loading}
            placeholder="123 456 7890"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Note
          </label>
          <textarea
            className="form-textarea"
            placeholder="Aggiungi note sul candidato..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={!firstName || !lastName || loading}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner-small"></span>
              {candidate ? "Aggiornamento..." : "Salvataggio..."}
            </span>
          ) : (
            <span className="btn-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {candidate ? (
                  <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>
                ) : (
                  <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                )}
              </svg>
              {candidate ? "Aggiorna Candidato" : "Salva Candidato"}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
