import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";

export default function InterviewForm({ onSaved }) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");

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

    await api.post("/interviews", {
      candidate_id: Number(candidateId),
      scheduled_at: dateTime,
      location
    });

    setCandidateId("");
    setDateTime("");
    setLocation("");
    onSaved && onSaved();
  };

  if (!["admin", "secretary"].includes(user.role)) return null;

  return (
    <form className="card card-inline" onSubmit={handleSubmit}>
      <h2>Nuovo colloquio</h2>

      <label>
        Candidato
        <select
          value={candidateId}
          onChange={e => setCandidateId(e.target.value)}
        >
          <option value="">Seleziona...</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>
              {c.last_name} {c.first_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Data e ora
        <input
          type="datetime-local"
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
        />
      </label>

      <label>
        Luogo
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </label>

      <button type="submit" disabled={!dateTime || !candidateId}>
        Salva
      </button>
    </form>
  );
}
