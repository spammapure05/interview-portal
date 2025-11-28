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
      <h1>Calendario colloqui</h1>
      {(user.role === "secretary" || user.role === "admin") && (
        <InterviewForm onSaved={load} />
      )}

      <ul className="list">
        {interviews.map(i => (
          <li key={i.id} className="card">
            <strong>
              {i.first_name} {i.last_name}
            </strong>
            <div>Quando: {new Date(i.scheduled_at).toLocaleString()}</div>
            <div>Luogo: {i.location || "N/D"}</div>
            <div>Stato: {i.status}</div>
            {"feedback" in i && i.feedback && (
              <div>
                <strong>Feedback:</strong> {i.feedback}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
