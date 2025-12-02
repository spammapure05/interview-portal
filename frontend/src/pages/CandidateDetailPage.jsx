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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return <div className="card">Caricamento...</div>;

  return (
    <div>
      <h1>👤 {candidate.last_name} {candidate.first_name}</h1>
      
      <div className="card">
        <h2>Informazioni Personali</h2>
        {candidate.email && <div>📧 <strong>Email:</strong> {candidate.email}</div>}
        {candidate.phone && <div>☎️ <strong>Telefono:</strong> {candidate.phone}</div>}
        {candidate.notes && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <strong>📝 Note:</strong>
            <p>{candidate.notes}</p>
          </div>
        )}
      </div>

      <h2>📅 Colloqui ({interviews.length})</h2>
      {interviews.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Nessun colloquio registrato per questo candidato.</p>
        </div>
      ) : (
        <ul className="list">
          {interviews.map(i => (
            <li key={i.id} className="card">
              <div style={{ marginBottom: "0.75rem" }}>
                <strong>📆 {new Date(i.scheduled_at).toLocaleDateString()}</strong>
                <span style={{ float: "right", color: "#64748b" }}>
                  {new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div>📍 <strong>Luogo:</strong> {i.location || "Non specificato"}</div>
              <div>🎯 <strong>Stato:</strong> {i.status}</div>
              {i.feedback && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.03)" }}>
                  <strong>💬 Feedback:</strong> {i.feedback}
                </div>
              )}
              {i.strengths && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>✅ Punti di forza:</strong> {i.strengths}
                </div>
              )}
              {i.weaknesses && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>⚠️ Aree di miglioramento:</strong> {i.weaknesses}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {interviews.length > 0 && (
        <div className="card">
          <h2>📋 Aggiungi / Modifica Valutazione (Solo Admin)</h2>
          <form onSubmit={handleSaveFeedback} style={{ display: "grid", gap: "0.75rem" }}>
            <label>
              <span className="input-label">Seleziona Colloquio *</span>
              <select
                value={selectedInterviewId}
                onChange={e => setSelectedInterviewId(e.target.value)}
                disabled={loading}
              >
                <option value="">Scegli un colloquio...</option>
                {interviews.map(i => (
                  <option key={i.id} value={i.id}>
                    {new Date(i.scheduled_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="input-label">Feedback</span>
              <textarea
                placeholder="Aggiungi feedback generale..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                disabled={loading}
                style={{ minHeight: "100px" }}
              />
            </label>
            <label>
              <span className="input-label">Punti di Forza</span>
              <textarea
                placeholder="Elencare i principali punti di forza..."
                value={strengths}
                onChange={e => setStrengths(e.target.value)}
                disabled={loading}
                style={{ minHeight: "100px" }}
              />
            </label>
            <label>
              <span className="input-label">Aree di Miglioramento</span>
              <textarea
                placeholder="Indicare le aree su cui migliorare..."
                value={weaknesses}
                onChange={e => setWeaknesses(e.target.value)}
                disabled={loading}
                style={{ minHeight: "100px" }}
              />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedInterviewId || loading}
            >
              {loading ? "Salvataggio..." : "Salva Valutazione"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
