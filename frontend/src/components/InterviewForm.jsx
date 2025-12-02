import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import DateTimePicker from "./DateTimePicker";
import { contactIcons } from "../utils/icons";

export default function InterviewForm({ onSaved }) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
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

  const handleSubmit = async e => {
    e.preventDefault();
    if (!candidateId || !dateTime) return;
    setLoading(true);
    try {
      await api.post("/interviews", {
        candidate_id: Number(candidateId),
        scheduled_at: dateTime,
        location
      });

      setCandidateId("");
      setDateTime("");
      setLocation("");
      onSaved && onSaved();
    } finally {
      setLoading(false);
    }
  };

  if (!["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="card card-inline">
      <h2>{contactIcons.interview} Nuovo Colloquio</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          <span className="input-label">Candidato *</span>
          <select
            value={candidateId}
            onChange={e => setCandidateId(e.target.value)}
            disabled={loading}
          >
            <option value="">Seleziona un candidato...</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>
                {c.last_name} {c.first_name}
              </option>
            ))}
          </select>
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

        <button
          type="submit"
          className="btn-primary"
          disabled={!dateTime || !candidateId || loading}
          style={{ marginTop: "0.5rem" }}
        >
          {loading ? "Salvataggio..." : "Programma Colloquio"}
        </button>
      </form>
    </div>
  );
}
