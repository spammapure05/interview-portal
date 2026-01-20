import { useAuth } from "../authContext";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ candidates: 0, interviews: 0, upcoming: 0 });
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [upcomingVehicles, setUpcomingVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
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
        const now = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

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
      } catch (err) {
        console.error("Errore caricamento stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

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
              : "Gestisci candidati e organizza i colloqui efficacemente."}
          </p>
        </div>
        <div className="hero-badge">
          <span className={`role-badge role-${user.role}`}>
            {user.role === "admin" ? "Amministratore" : "Segreteria"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
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
      </div>

      {/* Quick Actions */}
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
        </div>
      </div>

      {/* Recent Interviews */}
      {recentInterviews.length > 0 && (
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

      {/* Upcoming Events Row */}
      <div className="dashboard-events-row">
        {/* Upcoming Meetings */}
        <div className="dashboard-section dashboard-section-half">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Prossime riunioni
            <span className="section-badge">{upcomingMeetings.length}</span>
          </h2>
          {upcomingMeetings.length === 0 ? (
            <div className="empty-section">
              <p>Nessuna riunione nei prossimi 10 giorni</p>
              <Link to="/room-calendar" className="empty-action">Prenota sala</Link>
            </div>
          ) : (
            <div className="recent-list">
              {upcomingMeetings.map(meeting => (
                <Link to="/room-calendar" key={meeting.id} className="recent-item recent-item-link">
                  <div className="recent-avatar meeting-avatar" style={{ backgroundColor: meeting.room_color || "#3B82F6" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{meeting.title}</span>
                    <span className="recent-date">
                      {new Date(meeting.start_time).toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="recent-right">
                    <span className="room-badge" style={{ backgroundColor: meeting.room_color || "#3B82F6" }}>
                      {meeting.room_name}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="recent-arrow">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Vehicle Bookings */}
        <div className="dashboard-section dashboard-section-half">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
            </svg>
            Prossime prenotazioni veicoli
            <span className="section-badge">{upcomingVehicles.length}</span>
          </h2>
          {upcomingVehicles.length === 0 ? (
            <div className="empty-section">
              <p>Nessuna prenotazione veicolo nei prossimi 10 giorni</p>
              <Link to="/vehicle-calendar" className="empty-action">Prenota veicolo</Link>
            </div>
          ) : (
            <div className="recent-list">
              {upcomingVehicles.map(booking => (
                <Link to="/vehicle-calendar" key={booking.id} className="recent-item recent-item-link">
                  <div className="recent-avatar vehicle-avatar" style={{ backgroundColor: booking.vehicle_color || "#10B981" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                    </svg>
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{booking.driver_name}</span>
                    <span className="recent-date">
                      {new Date(booking.start_time).toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {booking.destination && ` - ${booking.destination}`}
                    </span>
                  </div>
                  <div className="recent-right">
                    <span className="vehicle-badge" style={{ backgroundColor: booking.vehicle_color || "#10B981" }}>
                      {booking.plate}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="recent-arrow">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
