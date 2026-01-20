import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";
import InterviewForm from "../components/InterviewForm";
import FeedbackForm from "../components/FeedbackForm";
import CalendarView from "../components/CalendarView";
import { Link, useSearchParams } from "react-router-dom";

export default function CalendarPage() {
  const authContext = useAuth();
  const user = authContext?.user;
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "calendar"
  const [timeFilter, setTimeFilter] = useState(() => {
    const filterParam = searchParams.get("filter");
    return filterParam === "upcoming" ? "upcoming" : "all";
  });
  const [editInterview, setEditInterview] = useState(null);
  const [feedbackInterview, setFeedbackInterview] = useState(null);

  const load = async () => {
    try {
      const res = await api.get("/interviews");
      setInterviews(res.data);
    } catch (err) {
      console.error("Errore caricamento colloqui", err);
    }
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

  const getStatusClass = (status) => {
    switch (status) {
      case "Programmato": return "status-scheduled";
      case "Completato": return "status-completed";
      case "Annullato": return "status-cancelled";
      default: return "";
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Calendario Colloqui</h1>
            <p className="page-subtitle-modern">Visualizza e pianifica i colloqui dei candidati</p>
          </div>
        </div>
      </div>

      <div className="page-layout">
        {/* Sidebar - Form */}
        <aside className="page-sidebar-modern">
          {user && (user.role === "secretary" || user.role === "admin") && (
            <InterviewForm onSaved={load} />
          )}
        </aside>

        {/* Main Content */}
        <div className="page-main">
          {/* Search & Filters */}
          <div className="filters-bar">
            <div className="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon-svg">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Cerca per nome o luogo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm("")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="all">Tutti i colloqui</option>
                <option value="upcoming">Prossimi</option>
                <option value="past">Passati</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-arrow">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Results Count & View Toggle */}
          <div className="results-info results-info-with-toggle">
            <span className="results-count-modern">
              {displayedInterviews.length} colloqui{displayedInterviews.length !== 1 ? "" : "o"}
            </span>
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="Vista lista"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "calendar" ? "active" : ""}`}
                onClick={() => setViewMode("calendar")}
                title="Vista calendario"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {viewMode === "calendar" ? (
            <CalendarView
              interviews={interviews}
              onEditInterview={setEditInterview}
              onFeedbackInterview={setFeedbackInterview}
              user={user}
            />
          ) : displayedInterviews.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="8" y1="14" x2="8" y2="14"/>
                  <line x1="12" y1="14" x2="12" y2="14"/>
                  <line x1="16" y1="14" x2="16" y2="14"/>
                </svg>
              </div>
              <h3>Nessun colloquio trovato</h3>
              <p>
                {interviews.length === 0
                  ? "Non ci sono colloqui programmati. Inizia aggiungendo il primo!"
                  : "Nessun colloquio corrisponde ai filtri selezionati."}
              </p>
            </div>
          ) : (
            <div className="interviews-grid">
              {displayedInterviews.map(i => (
                <div key={i.id} className="interview-card-modern">
                  <div className="interview-card-header">
                    <div className="candidate-info">
                      <div className="candidate-avatar">
                        {i.first_name?.charAt(0)}{i.last_name?.charAt(0)}
                      </div>
                      <div className="candidate-details">
                        <Link to={`/candidates/${i.candidate_id}`} className="candidate-name-link">
                          {i.first_name} {i.last_name}
                        </Link>
                        <span className="interview-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {i.location || "Luogo non specificato"}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge-modern ${getStatusClass(i.status)}`}>
                      {i.status}
                    </span>
                  </div>

                  <div className="interview-card-body">
                    <div className="interview-datetime">
                      <div className="datetime-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{new Date(i.scheduled_at).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
                      </div>
                      <div className="datetime-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{new Date(i.scheduled_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>

                    {i.feedback && (
                      <div className="interview-feedback">
                        <strong>Feedback:</strong> {i.feedback}
                      </div>
                    )}
                  </div>

                  {user && (user.role === "admin" || user.role === "secretary") && (
                    <div className="interview-card-actions">
                      <button className="btn-icon" title="Modifica" onClick={() => setEditInterview(i)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {user.role === "admin" && (
                        <button className="btn-icon btn-feedback" title="Valutazione" onClick={() => setFeedbackInterview(i)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editInterview && (
        <div className="modal-overlay" onClick={() => setEditInterview(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifica Colloquio</h2>
              <button className="modal-close" onClick={() => setEditInterview(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <InterviewForm
              interview={editInterview}
              onSaved={() => { setEditInterview(null); load(); }}
              onCancel={() => setEditInterview(null)}
            />
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackInterview && (
        <div className="modal-overlay" onClick={() => setFeedbackInterview(null)}>
          <div className="modal-content modal-feedback" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Valutazione Colloquio</h2>
              <button className="modal-close" onClick={() => setFeedbackInterview(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <FeedbackForm
              interview={feedbackInterview}
              onSaved={() => { setFeedbackInterview(null); load(); }}
              onCancel={() => setFeedbackInterview(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
