import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { contactIcons } from "../utils/icons";
import CandidateForm from "../components/CandidateForm";
import InterviewForm from "../components/InterviewForm";
import { useAuth } from "../authContext";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [loading, setLoading] = useState(false);
  const [editInterview, setEditInterview] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

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


  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();
  if (!candidate) return <div className="card">Caricamento...</div>;

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem 0" }}>{contactIcons.name} {candidate.last_name} {candidate.first_name}</h1>
      {editMode ? (
        <CandidateForm candidate={candidate} onSaved={() => { setEditMode(false); load(); }} />
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Informazioni Personali</h2>
            {user && ["admin", "secretary"].includes(user.role) && (
              <button type="button" className="icon-btn" title="Modifica dati candidato" onClick={() => setEditMode(true)}>✏️</button>
            )}
          </div>
          {candidate.email && <div>{contactIcons.email} <strong>Email:</strong> {candidate.email}</div>}
          {candidate.phone && <div>{contactIcons.phone} <strong>Telefono:</strong> {candidate.phone}</div>}
          {candidate.notes && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <strong>{contactIcons.notes} Note:</strong>
              <p>{candidate.notes}</p>
            </div>
          )}
        </div>
      )}

      <h2>📅 Colloqui ({interviews.length})</h2>
      {interviews.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Nessun colloquio registrato per questo candidato.</p>
        </div>
      ) : (
        <ul className="list">
          {interviews.map(i => (
            <li key={i.id} className="card" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <strong>{contactIcons.calendar} {new Date(i.scheduled_at).toLocaleDateString()}</strong>
                  <div style={{ color: "#64748b", fontSize: "0.95rem" }}>
                    {contactIcons.time} {new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div>
                  {user && ["admin", "secretary"].includes(user.role) ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button type="button" className="icon-btn" title="Modifica colloquio" onClick={() => setEditInterview(i)}>✏️</button>
                      {i.status === "Programmato" && (
                        <button className="btn-danger" title="Annulla colloquio" onClick={() => setCancelConfirm(i)}>Annulla</button>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.9rem" }} title="Richiede permessi admin/secretary">Azioni riservate</span>
                  )}
                </div>
              </div>
              <div>{contactIcons.location} <strong>Luogo:</strong> {i.location || "Non specificato"}</div>
              <div>{contactIcons.status} <strong>Stato:</strong> {i.status}</div>
              {i.feedback && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.03)" }}>
                  <strong>{contactIcons.feedback} Feedback:</strong> {i.feedback}
                </div>
              )}
              {i.strengths && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>{contactIcons.strengths} Punti di forza:</strong> {i.strengths}
                </div>
              )}
              {i.weaknesses && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>{contactIcons.weaknesses} Aree di miglioramento:</strong> {i.weaknesses}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modale di modifica evento */}
      {editInterview && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>Modifica Colloquio</h2>
            {user ? (
              <InterviewForm
                interview={editInterview}
                onSaved={() => { setEditInterview(null); load(); }}
                onCancel={() => setEditInterview(null)}
              />
            ) : (
              <div style={{ padding: "1rem 0" }}>Caricamento informazioni utente...</div>
            )}
          </div>
        </div>
      )}

      {/* Modale di conferma annullamento evento */}
      {cancelConfirm && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: "400px" }}>
            <h2>Conferma Annullamento</h2>
            <p>Sei sicuro di voler annullare questo colloquio?</p>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "1rem" }}>
              Data: {new Date(cancelConfirm.scheduled_at).toLocaleString()}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button 
                className="btn-danger" 
                onClick={async () => {
                  await api.put(`/interviews/${cancelConfirm.id}`, { status: "Annullato" });
                  setCancelConfirm(null);
                  load();
                }}
              >
                Sì, Annulla Colloquio
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setCancelConfirm(null)}
              >
                No, Torna Indietro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
