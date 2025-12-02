import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import InterviewForm from "../components/InterviewForm";
import { contactIcons } from "../utils/icons";

export default function CalendarPage() {
  const { user } = useAuth();
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
      <h1>📅 Calendario Colloqui</h1>
      <p>Visualizza e pianifica i colloqui dei candidati.</p>

      <div className="page-container">
        {/* Sidebar - Form */}
        <div className="page-sidebar">
          {(user.role === "secretary" || user.role === "admin") && (
            <InterviewForm onSaved={load} />
          )}
        </div>

        {/* Main Content - List */}
        <div className="page-content">
          {/* Search and Filter */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Cerca per nome o luogo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            <div className="filter-label">Filtro Temporale</div>
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value)}
            >
              <option value="all">📅 Tutti i colloqui</option>
              <option value="upcoming">⏭️ Prossimi colloqui</option>
              <option value="past">⏰ Colloqui passati</option>
            </select>
          </div>

          <div className="results-count">
            {displayedInterviews.length} colloquio{displayedInterviews.length !== 1 ? "i" : ""} trovato{displayedInterviews.length !== 1 ? "i" : ""}
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
                <div key={i.id} className="card">
                  <strong>
                    {contactIcons.interview} {i.first_name} {i.last_name}
                  </strong>
                  <div>
                    <span>{contactIcons.calendar} {new Date(i.scheduled_at).toLocaleDateString()}</span>
                    <span>{contactIcons.time} {new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div>
                    <span>{contactIcons.location} {i.location || "Luogo non specificato"}</span>
                    <span className={`status-badge status-${i.status}`}>{i.status}</span>
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
