import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../authContext";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import api from "../api";

export default function Layout() {
  const { user, logout, showTimeoutWarning, timeRemaining, extendSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isDropdownActive = (paths) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  // Fetch pending requests count for admin badge
  useEffect(() => {
    if (user?.role === "admin") {
      const fetchPendingCount = async () => {
        try {
          const res = await api.get("/booking-requests/count/pending");
          setPendingRequestsCount(res.data.count);
        } catch (err) {
          console.error("Error fetching pending count:", err);
        }
      };
      fetchPendingCount();
      // Refresh every 60 seconds
      const interval = setInterval(fetchPendingCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <Link to="/" className="logo-link">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="logo">Interview Portal</span>
          </Link>
          {user && (
            <nav className="main-nav" ref={dropdownRef}>
              {/* Dashboard - sempre visibile */}
              <Link to="/" className={`nav-link ${isActive("/") && location.pathname === "/" ? "active" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Dashboard</span>
              </Link>

              {/* Dropdown Colloqui - Non visibile per i viewer */}
              {user.role !== "viewer" && (
                <div className={`nav-dropdown ${isDropdownActive(["/calendar", "/candidates"]) ? "has-active" : ""}`}>
                  <button
                    className={`nav-link dropdown-toggle ${openDropdown === "colloqui" ? "open" : ""}`}
                    onClick={() => toggleDropdown("colloqui")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Colloqui</span>
                    <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {openDropdown === "colloqui" && (
                    <div className="dropdown-menu">
                      <Link to="/calendar" className={`dropdown-item ${isActive("/calendar") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Calendario Colloqui
                      </Link>
                      <Link to="/candidates" className={`dropdown-item ${isActive("/candidates") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                        Anagrafica Candidati
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown Sale Meeting */}
              <div className={`nav-dropdown ${isDropdownActive(["/room-calendar", "/rooms"]) ? "has-active" : ""}`}>
                <button
                  className={`nav-link dropdown-toggle ${openDropdown === "sale" ? "open" : ""}`}
                  onClick={() => toggleDropdown("sale")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <span>Sale</span>
                  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openDropdown === "sale" && (
                  <div className="dropdown-menu">
                    <Link to="/room-calendar" className={`dropdown-item ${isActive("/room-calendar") ? "active" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Prenota Sale
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/rooms" className={`dropdown-item ${isActive("/rooms") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"/>
                          <rect x="14" y="3" width="7" height="7"/>
                          <rect x="14" y="14" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Gestione Sale
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Veicoli */}
              <div className={`nav-dropdown ${isDropdownActive(["/vehicle-calendar", "/vehicles"]) ? "has-active" : ""}`}>
                <button
                  className={`nav-link dropdown-toggle ${openDropdown === "veicoli" ? "open" : ""}`}
                  onClick={() => toggleDropdown("veicoli")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                    <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                    <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                  </svg>
                  <span>Veicoli</span>
                  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openDropdown === "veicoli" && (
                  <div className="dropdown-menu">
                    <Link to="/vehicle-calendar" className={`dropdown-item ${isActive("/vehicle-calendar") ? "active" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Prenota Veicoli
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/vehicles" className={`dropdown-item ${isActive("/vehicles") && !isActive("/vehicle-calendar") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
                        </svg>
                        Gestione Veicoli
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Richieste - Per tutti gli utenti */}
              <div className={`nav-dropdown ${isDropdownActive(["/request-booking", "/my-requests", "/admin-requests"]) ? "has-active" : ""}`}>
                <button
                  className={`nav-link dropdown-toggle ${openDropdown === "richieste" ? "open" : ""}`}
                  onClick={() => toggleDropdown("richieste")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <span>Richieste</span>
                  {user.role === "admin" && pendingRequestsCount > 0 && (
                    <span className="nav-badge">{pendingRequestsCount}</span>
                  )}
                  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openDropdown === "richieste" && (
                  <div className="dropdown-menu">
                    <Link to="/request-booking" className={`dropdown-item ${isActive("/request-booking") ? "active" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Nuova Richiesta
                    </Link>
                    <Link to="/my-requests" className={`dropdown-item ${isActive("/my-requests") ? "active" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      Le Mie Richieste
                    </Link>
                    {(user.role === "admin" || user.role === "secretary") && (
                      <Link to="/admin-requests" className={`dropdown-item ${isActive("/admin-requests") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Gestione Richieste
                        {pendingRequestsCount > 0 && (
                          <span className="dropdown-badge">{pendingRequestsCount}</span>
                        )}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Section */}
              {user.role === "admin" && (
                <div className={`nav-dropdown ${isDropdownActive(["/stats", "/users", "/global-calendar", "/notification-settings"]) ? "has-active" : ""}`}>
                  <button
                    className={`nav-link dropdown-toggle ${openDropdown === "admin" ? "open" : ""}`}
                    onClick={() => toggleDropdown("admin")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
                    </svg>
                    <span>Admin</span>
                    <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {openDropdown === "admin" && (
                    <div className="dropdown-menu">
                      <Link to="/global-calendar" className={`dropdown-item ${isActive("/global-calendar") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                          <circle cx="8" cy="14" r="1"/>
                          <circle cx="12" cy="14" r="1"/>
                          <circle cx="16" cy="14" r="1"/>
                        </svg>
                        Calendario Globale
                      </Link>
                      <Link to="/stats" className={`dropdown-item ${isActive("/stats") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="20" x2="18" y2="10"/>
                          <line x1="12" y1="20" x2="12" y2="4"/>
                          <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                        Statistiche
                      </Link>
                      <Link to="/users" className={`dropdown-item ${isActive("/users") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Gestione Utenti
                      </Link>
                      <Link to="/notification-settings" className={`dropdown-item ${isActive("/notification-settings") ? "active" : ""}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        Impostazioni Notifiche
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}
        </div>
        {user && (
          <div className="app-header-right">
            <GlobalSearch />
            <ThemeToggle />
            <NotificationBell />
            <div className="user-pill">
              <div className="user-avatar">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-email">{user.email}</span>
                <span className={`user-role role-${user.role}`}>
                  {user.role === "admin" ? "Admin" : user.role === "viewer" ? "Viewer" : "Segreteria"}
                </span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>
      <main className="app-main">
        <Outlet />
      </main>

      {/* Session Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="modal-overlay timeout-modal-overlay">
          <div className="modal-content modal-small timeout-modal">
            <div className="timeout-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h2>Sessione in scadenza</h2>
            <p>La tua sessione scadrà tra <strong>{timeRemaining}</strong> secondi per inattività.</p>
            <div className="timeout-actions">
              <button className="btn-secondary" onClick={handleLogout}>
                Esci ora
              </button>
              <button className="btn-primary" onClick={extendSession}>
                Continua sessione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
