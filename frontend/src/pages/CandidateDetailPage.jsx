import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState("");

  const load = async () => {
    const [candRes, intRes] = await Promise.all([
      api.get(`/candidates/${id}`),
      api.get(`/interviews?candidate_id=${id}`)
    ]);
    setCandidate(candRes.data);
    setInterviews(intRes.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSaveFeedback = async e => {
    e.preventDefault();
    if (!selectedInterviewId) return;

    await api.put(`/interviews/${selectedInterviewId}`, {
      feedback,
      strengths,
      weaknesses
    });

    setFeedback("");
    setStrengths("");
    setWeaknesses("");
    setSelectedInterviewId("");
    load();
  };

  if (!candidate) return <div>Caricamento...</div>;

  return (
    <div>
      <h1>
        {candidate.last_name} {candidate.first_name}
      </h1>
      {candidate.email && <div>Email: {candidate.email}</div>}
      {candidate.phone && <div>Telefono: {candidate.phone}</div>}
      {candidate.notes && (
        <div>
          <strong>Note:</strong> {candidate.notes}
        </div>
      )}

      <h2>Colloqui</h2>
      <ul className="list">
        {interviews.map(i => (
          <li key={i.id} className="card">
            <div>
              <strong>Data:</strong>{" "}
              {new Date(i.scheduled_at).toLocaleString()}
            </div>
            <div>
              <strong>Luogo:</strong> {i.location || "N/D"}
            </div>
            <div>
              <strong>Stato:</strong> {i.status}
            </div>
            {i.feedback && (
              <div>
                <strong>Feedback:</strong> {i.feedback}
              </div>
            )}
            {i.strengths && (
              <div>
                <strong>Punti di forza:</strong> {i.strengths}
              </div>
            )}
            {i.weaknesses && (
              <div>
                <strong>Aree di miglioramento:</strong> {i.weaknesses}
              </div>
            )}
          </li>
        ))}
      </ul>

      {interviews.length > 0 && (
        <form className="card" onSubmit={handleSaveFeedback}>
          <h2>Aggiungi / modifica feedback colloquio (solo admin)</h2>
          <label>
            Colloquio
            <select
              value={selectedInterviewId}
              onChange={e => setSelectedInterviewId(e.target.value)}
            >
              <option value="">Seleziona...</option>
              {interviews.map(i => (
                <option key={i.id} value={i.id}>
                  {new Date(i.scheduled_at).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Feedback
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
          </label>
          <label>
            Punti di forza
            <textarea
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
            />
          </label>
          <label>
            Aree di miglioramento
            <textarea
              value={weaknesses}
              onChange={e => setWeaknesses(e.target.value)}
            />
          </label>
          <button type="submit" disabled={!selectedInterviewId}>
            Salva feedback
          </button>
        </form>
      )}
    </div>
  );
}
