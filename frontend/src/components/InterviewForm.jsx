import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import DateTimePicker from "./DateTimePicker";
import SearchableSelect from "./SearchableSelect";

export default function InterviewForm({ interview, onSaved, onCancel }) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState(interview ? interview.candidate_id : "");
  const [dateTime, setDateTime] = useState(interview ? interview.scheduled_at : "");
  const [location, setLocation] = useState(interview ? interview.location : "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/candidates");
        // L'API restituisce { data: [...], total: N }
        setCandidates(res.data.data || res.data);
      } catch (err) {
        console.error("Errore caricando candidati", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (interview) {
      setCandidateId(interview.candidate_id);
      setDateTime(interview.scheduled_at);
      setLocation(interview.location || "");
    }
  }, [interview]);

  const reloadCandidates = async () => {
    try {
      const res = await api.get("/candidates");
      // L'API restituisce { data: [...], total: N }
      setCandidates(res.data.data || res.data);
    } catch (err) {
      console.error("Errore ricaricando candidati", err);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!candidateId || !dateTime) return;
    setLoading(true);
    try {
      if (interview && interview.id) {
        await api.put(`/interviews/${interview.id}`, {
          candidate_id: Number(candidateId),
          scheduled_at: dateTime,
          location
        });
      } else {
        await api.post("/interviews", {
          candidate_id: Number(candidateId),
          scheduled_at: dateTime,
          location
        });
        setCandidateId("");
        setDateTime("");
        setLocation("");
      }
      onSaved && onSaved();
    } finally {
      setLoading(false);
    }
  };

  if (user === null || user === undefined) {
    return (
      <div className="form-card">
        <div className="form-card-header">
          <div className="form-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2>Caricamento...</h2>
        </div>
        <div className="loading-form">
          <div className="spinner-small"></div>
          <p>Caricamento modulo colloquio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div className="form-card-header">
        <div className="form-icon">
          {interview ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="18"/>
              <line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
          )}
        </div>
        <h2>{interview ? "Modifica Colloquio" : "Nuovo Colloquio"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Candidato <span className="required">*</span>
          </label>
          <SearchableSelect
            options={candidates.map(c => ({ value: c.id, label: `${c.last_name} ${c.first_name}` }))}
            value={candidateId}
            onChange={val => setCandidateId(val)}
            placeholder="Seleziona un candidato..."
            disabled={loading}
            onOpen={reloadCandidates}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Data e Ora <span className="required">*</span>
          </label>
          <DateTimePicker
            value={dateTime}
            onChange={setDateTime}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Luogo
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Es. Sala Riunioni A, Video Call..."
            value={location}
            onChange={e => setLocation(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-actions-row">
          <button
            type="submit"
            className="btn-submit"
            disabled={!dateTime || !candidateId || loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small"></span>
                {interview ? "Aggiornamento..." : "Salvataggio..."}
              </span>
            ) : (
              <span className="btn-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {interview ? (
                    <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>
                  ) : (
                    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                  )}
                </svg>
                {interview ? "Aggiorna Colloquio" : "Salva Colloquio"}
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
