import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import InterviewForm from "../components/InterviewForm";

export default function CalendarPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);

  const load = async () => {
    const res = await api.get("/interviews");
    setInterviews(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>📅 Calendario Colloqui</h1>
      <p>Visualizza e pianifica i colloqui dei candidati.</p>
      
      {(user.role === "secretary" || user.role === "admin") && (
        <InterviewForm onSaved={load} />
      )}

      {interviews.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "#94a3b8" }}>
            Nessun colloquio programmato. Aggiungi il primo colloquio per iniziare!
          </p>
        </div>
      ) : (
        <ul className="list">
          {interviews.map(i => (
            <li key={i.id} className="card">
              <strong>
                {i.first_name} {i.last_name}
              </strong>
              <div>
                <span>📆 {new Date(i.scheduled_at).toLocaleDateString()}</span>
                <span>{new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div>
                <span>📍 {i.location || "Luogo non specificato"}</span>
                <span className={`status-badge status-${i.status}`}>{i.status}</span>
              </div>
              {"feedback" in i && i.feedback && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <strong>💬 Feedback:</strong> {i.feedback}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
