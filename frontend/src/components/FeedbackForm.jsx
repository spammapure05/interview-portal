import { useState, useEffect } from "react";
import api from "../api";

export default function FeedbackForm({ interview, onSaved, onCancel }) {
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [status, setStatus] = useState("Programmato");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (interview) {
      setFeedback(interview.feedback || "");
      setStrengths(interview.strengths || "");
      setWeaknesses(interview.weaknesses || "");
      setStatus(interview.status || "Programmato");
    }
  }, [interview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/interviews/${interview.id}`, {
        feedback,
        strengths,
        weaknesses,
        status
      });
      onSaved && onSaved();
    } catch (err) {
      console.error("Errore salvataggio feedback", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-card-header">
        <div className="form-icon feedback-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2>Valutazione Colloquio</h2>
      </div>

      <form onSubmit={handleSubmit} className="modern-form">
        {/* Candidato info */}
        <div className="feedback-candidate-info">
          <div className="feedback-avatar">
            {interview?.first_name?.charAt(0)}{interview?.last_name?.charAt(0)}
          </div>
          <div className="feedback-candidate-details">
            <span className="feedback-candidate-name">
              {interview?.first_name} {interview?.last_name}
            </span>
            <span className="feedback-candidate-date">
              {interview?.scheduled_at && new Date(interview.scheduled_at).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Stato Colloquio
          </label>
          <select
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
          >
            <option value="Programmato">Programmato</option>
            <option value="Completato">Completato</option>
            <option value="Annullato">Annullato</option>
          </select>
        </div>

        {/* Feedback */}
        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Note Conclusive
          </label>
          <textarea
            className="form-textarea"
            placeholder="Scrivi le note conclusive del colloquio..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>

        {/* Strengths */}
        <div className="form-group">
          <label className="form-label label-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Punti di Forza
          </label>
          <textarea
            className="form-textarea"
            placeholder="Elenca i punti di forza del candidato..."
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>

        {/* Weaknesses */}
        <div className="form-group">
          <label className="form-label label-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Aree di Miglioramento
          </label>
          <textarea
            className="form-textarea"
            placeholder="Elenca le aree di miglioramento..."
            value={weaknesses}
            onChange={(e) => setWeaknesses(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>

        <div className="form-actions-row">
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small"></span>
                Salvataggio...
              </span>
            ) : (
              <span className="btn-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Salva Valutazione
              </span>
            )}
          </button>
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
              Annulla
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
