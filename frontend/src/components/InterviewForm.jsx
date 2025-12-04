import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import DateTimePicker from "./DateTimePicker";
import SearchableSelect from "./SearchableSelect";
import { contactIcons } from "../utils/icons";

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
        setCandidates(res.data);
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

  // expose a reload for parent open events
  const reloadCandidates = async () => {
    try {
      const res = await api.get("/candidates");
      setCandidates(res.data);
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

  // If auth state hasn't resolved yet, show a small loader inside the modal
  if (user === null || user === undefined) {
    return (
      <div className="card card-inline">
        <h2>{contactIcons.interview} Caricamento...</h2>
        <div>Verifica permessi utente...</div>
      </div>
    );
  }

  if (!["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="card card-inline">
      <h2>{contactIcons.interview} Nuovo Colloquio</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          <span className="input-label">Candidato *</span>
          <SearchableSelect
            options={candidates.map(c => ({ value: c.id, label: `${c.last_name} ${c.first_name}` }))}
            value={candidateId}
            onChange={val => setCandidateId(val)}
            placeholder="Seleziona un candidato..."
            disabled={loading}
            onOpen={reloadCandidates}
          />
        </label>

        <label>
          <span className="input-label">Data e Ora *</span>
          <DateTimePicker
            value={dateTime}
            onChange={setDateTime}
            disabled={loading}
          />
        </label>

        <label>
          <span className="input-label">Luogo</span>
          <input
            type="text"
            placeholder="Es. Sala Riunioni A, Video Call, Esterno..."
            value={location}
            onChange={e => setLocation(e.target.value)}
            disabled={loading}
          />
        </label>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={!dateTime || !candidateId || loading}
          >
            {interview ? "Aggiorna Colloquio" : "Salva Colloquio"}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
              Annulla
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
