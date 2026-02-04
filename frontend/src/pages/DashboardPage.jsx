import { useAuth } from "../authContext";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api";
import MatrixEffect from "../components/MatrixEffect";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ candidates: 0, interviews: 0, upcoming: 0 });
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [upcomingVehicles, setUpcomingVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matrixActive, setMatrixActive] = useState(false);
  const bufferRef = useRef("");
  const timeoutRef = useRef(null);

  // Easter egg: type "matrix" to activate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (matrixActive) return;
      if (e.key.length !== 1) return;

      clearTimeout(timeoutRef.current);
      bufferRef.current += e.key.toLowerCase();

      if (bufferRef.current.includes("matrix")) {
        bufferRef.current = "";
        setMatrixActive(true);
        return;
      }

      // Keep only last 10 chars
      if (bufferRef.current.length > 10) {
        bufferRef.current = bufferRef.current.slice(-10);
      }

      // Reset buffer after 2s of inactivity
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = "";
      }, 2000);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutRef.current);
    };
  }, [matrixActive]);

  const exitMatrix = useCallback(() => setMatrixActive(false), []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

        // I viewer non vedono candidati/colloqui, quindi non li carichiamo
        if (user.role === "viewer") {
          const [meetingsRes, vehiclesRes] = await Promise.all([
            api.get("/room-meetings"),
            api.get("/vehicle-bookings")
          ]);

          // Filter meetings in next 10 days
          const meetings = meetingsRes.data
            .filter(m => {
              const meetingDate = new Date(m.start_time);
              return meetingDate >= now && meetingDate <= tenDaysFromNow;
            })
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);

          // Filter vehicle bookings in next 10 days
          const vehicles = vehiclesRes.data
            .filter(v => {
              const bookingDate = new Date(v.start_time);
              return bookingDate >= now && bookingDate <= tenDaysFromNow && !v.returned;
            })
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);

          setUpcomingMeetings(meetings);
          setUpcomingVehicles(vehicles);
        } else {
          const [candRes, intRes, meetingsRes, vehiclesRes] = await Promise.all([
            api.get("/candidates"),
            api.get("/interviews"),
            api.get("/room-meetings"),
            api.get("/vehicle-bookings")
          ]);

          // L'API candidates restituisce { data: [...], total: N }
          const candidates = candRes.data.data || candRes.data;
          const candidatesCount = candRes.data.total || candidates.length;

          const interviews = intRes.data;

          const upcoming = interviews.filter(i => new Date(i.scheduled_at) > now);
          const recent = interviews
            .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
            .slice(0, 5);

          // Filter meetings in next 10 days
          const meetings = meetingsRes.data
            .filter(m => {
              const meetingDate = new Date(m.start_time);
              return meetingDate >= now && meetingDate <= tenDaysFromNow;
            })
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);

          // Filter vehicle bookings in next 10 days
          const vehicles = vehiclesRes.data
            .filter(v => {
              const bookingDate = new Date(v.start_time);
              return bookingDate >= now && bookingDate <= tenDaysFromNow && !v.returned;
            })
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);

          setStats({
            candidates: candidatesCount,
            interviews: interviews.length,
            upcoming: upcoming.length
          });
          setRecentInterviews(recent);
          setUpcomingMeetings(meetings);
          setUpcomingVehicles(vehicles);
        }
      } catch (err) {
        console.error("Errore caricamento stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user.role]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  return (
    <div className="dashboard-page">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            {getGreeting()}, <span className="hero-name">{user.email.split("@")[0]}</span>
          </h1>
          <p className="hero-subtitle">
            {user.role === "admin"
              ? "Panoramica completa di candidati, colloqui e valutazioni."
              : user.role === "viewer"
              ? "Gestisci prenotazioni di sale e veicoli aziendali."
              : "Gestisci candidati e organizza i colloqui efficacemente."}
          </p>
        </div>
        <div className="hero-badge">
          <span className={`role-badge role-${user.role}`}>
            {user.role === "admin" ? "Amministratore" : user.role === "viewer" ? "Visualizzatore" : "Segreteria"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {/* Candidati, Colloqui, Prossimi colloqui - solo per admin/secretary */}
        {user.role !== "viewer" && (
          <>
            <Link to="/candidates" className="stat-card stat-card-link stat-candidates">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{loading ? "..." : stats.candidates}</span>
                <span className="stat-label">Candidati</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stat-arrow">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>

            <Link to="/calendar" className="stat-card stat-card-link stat-interviews">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{loading ? "..." : stats.interviews}</span>
                <span className="stat-label">Colloqui totali</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stat-arrow">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>

            <Link to="/calendar?filter=upcoming" className="stat-card stat-card-link stat-upcoming">
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{loading ? "..." : stats.upcoming}</span>
                <span className="stat-label">Prossimi colloqui</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stat-arrow">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          </>
        )}

        {/* Prossime riunioni - visibile a tutti */}
        <Link to="/room-calendar" className="stat-card stat-card-link stat-meetings">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{loading ? "..." : upcomingMeetings.length}</span>
            <span className="stat-label">Prossime riunioni</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stat-arrow">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>

        {/* Prossime prenotazioni veicoli - visibile a tutti */}
        <Link to="/vehicle-calendar" className="stat-card stat-card-link stat-vehicles">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{loading ? "..." : upcomingVehicles.length}</span>
            <span className="stat-label">Prenotazioni veicoli</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="stat-arrow">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </div>

      {/* Quick Actions - Nascosti per i viewer */}
      {user.role !== "viewer" && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Azioni rapide
          </h2>
          <div className="actions-grid">
            <Link to="/calendar" className="action-card action-calendar">
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Calendario Colloqui</h3>
                <p>Visualizza e pianifica tutti i colloqui programmati</p>
              </div>
              <div className="action-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </Link>

            <Link to="/candidates" className="action-card action-candidates">
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Gestisci Candidati</h3>
                <p>Aggiungi nuovi profili e gestisci i candidati esistenti</p>
              </div>
              <div className="action-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </Link>

            <Link to="/room-calendar" className="action-card action-rooms">
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Prenota Sala</h3>
                <p>Prenota una sala meeting per le tue riunioni</p>
              </div>
              <div className="action-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </Link>

            <Link to="/vehicle-calendar" className="action-card action-vehicles">
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                  <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                  <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Prenota Veicolo</h3>
                <p>Prenota un veicolo aziendale per le trasferte</p>
              </div>
              <div className="action-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Interviews - Nascosti per i viewer */}
      {user.role !== "viewer" && recentInterviews.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Colloqui recenti
          </h2>
          <div className="recent-list">
            {recentInterviews.map(interview => (
              <Link to={`/candidates/${interview.candidate_id}`} key={interview.id} className="recent-item recent-item-link">
                <div className="recent-avatar">
                  {interview.first_name?.charAt(0)}{interview.last_name?.charAt(0)}
                </div>
                <div className="recent-info">
                  <span className="recent-name">{interview.first_name} {interview.last_name}</span>
                  <span className="recent-date">
                    {new Date(interview.scheduled_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="recent-right">
                  <span className={`status-pill status-${interview.status}`}>
                    {interview.status}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="recent-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {matrixActive && <MatrixEffect onExit={exitMatrix} />}
    </div>
  );
}
