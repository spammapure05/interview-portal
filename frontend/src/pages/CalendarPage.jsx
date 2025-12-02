import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import InterviewForm from "../components/InterviewForm";
import { contactIcons } from "../utils/icons";

export default function CalendarPage() {
  const authContext = useAuth();
  const user = authContext?.user;
  const [interviews, setInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");

  const load = async () => {
    const res = await api.get("/interviews");
    setInterviews(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Filtro per ricerca (nome candidato, luogo)
  const filteredBySearch = interviews.filter(i => {
    const fullName = `${i.first_name} ${i.last_name}`.toLowerCase();
    const location = (i.location || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || location.includes(search);
  });

  // Filtro temporale
  const now = new Date();
  const filteredByTime = filteredBySearch.filter(i => {
    const interviewDate = new Date(i.scheduled_at);
    if (timeFilter === "upcoming") {
      return interviewDate > now;
    } else if (timeFilter === "past") {
      return interviewDate < now;
    }
    return true; // all
  });

  const displayedInterviews = filteredByTime;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="title-icon" aria-hidden="true" />
          <h1>Calendario Colloqui</h1>
        </div>
        <p className="page-sub">Visualizza e pianifica i colloqui dei candidati.</p>
      </div>

      <div className="page-container">
        {/* Sidebar - Form */}
        <div className="page-sidebar">
          {user && (user.role === "secretary" || user.role === "admin") && (
            <InterviewForm onSaved={load} />
          )}
        </div>

        {/* Main Content - List */}
        <div className="page-content">
          {/* Search + Filters Row */}
          <div className="search-row">
            <div className="search-bar large">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Cerca per nome, data, luogo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-bar small">
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="all">Tutti</option>
                <option value="upcoming">Prossimi</option>
                <option value="past">Passati</option>
              </select>
            </div>
          </div>

          <div className="results-count">
            {displayedInterviews.length} risultato{displayedInterviews.length !== 1 ? "i" : ""}
          </div>

          {displayedInterviews.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">📭</div>
              <p>
                {interviews.length === 0
                  ? "Nessun colloquio programmato. Aggiungi il primo colloquio per iniziare!"
                  : "Nessun colloquio corrisponde ai tuoi filtri."}
              </p>
            </div>
          ) : (
            <div className="list-container">
              {displayedInterviews.map(i => (
                <div key={i.id} className="card interview-card">
                  <div className="interview-left">
                    <a className="interview-name">{contactIcons.interview} <span className="name-link">{i.first_name} {i.last_name}</span></a>
                    <div className="meta-row">
                      <span className="meta">{contactIcons.calendar} {new Date(i.scheduled_at).toLocaleDateString()}</span>
                      <span className="meta">{contactIcons.time} {new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div className="interview-right">
                    <div className={`status-badge status-${i.status}`}>{i.status}</div>
                    <div className="meta-location">{contactIcons.location} {i.location || "Luogo non specificato"}</div>
                  </div>

                  {"feedback" in i && i.feedback && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      <strong>{contactIcons.feedback} Feedback:</strong> {i.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
