import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
  };

  const hasResults =
    results &&
    (results.candidates?.length > 0 ||
      results.interviews?.length > 0 ||
      results.meetings?.length > 0 ||
      results.vehicles?.length > 0 ||
      results.bookings?.length > 0);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="global-search-container" ref={searchRef}>
      {/* Search Button */}
      <button
        className="global-search-btn"
        onClick={() => setIsOpen(true)}
        title="Cerca (Ctrl+K)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="global-search-btn-label">Cerca</span>
        <kbd className="search-shortcut">Ctrl+K</kbd>
      </button>

      {/* Search Balloon/Popup */}
      {isOpen && (
        <>
          <div className="search-overlay" onClick={() => setIsOpen(false)} />
          <div className="search-balloon">
            <div className="search-balloon-header">
              <div className="search-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  className="search-balloon-input"
                  placeholder="Cerca candidati, colloqui, sale, veicoli..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="search-clear-btn"
                    onClick={() => {
                      setQuery("");
                      setResults(null);
                      inputRef.current?.focus();
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <button className="search-close-btn" onClick={() => setIsOpen(false)}>
                <span>Esc</span>
              </button>
            </div>

            <div className="search-balloon-content">
              {loading && (
                <div className="search-loading">
                  <div className="loading-spinner-small"></div>
                  <span>Ricerca in corso...</span>
                </div>
              )}

              {!loading && query.length < 2 && (
                <div className="search-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p>Digita almeno 2 caratteri per cercare</p>
                </div>
              )}

              {!loading && !hasResults && query.length >= 2 && (
                <div className="search-no-results">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p>Nessun risultato per "{query}"</p>
                </div>
              )}

              {!loading && hasResults && (
                <div className="search-results-list">
                  {/* Candidates */}
                  {results.candidates?.length > 0 && (
                    <div className="search-results-section">
                      <div className="search-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Candidati
                      </div>
                      {results.candidates.map((c) => (
                        <Link
                          key={`candidate-${c.id}`}
                          to={`/candidates/${c.id}`}
                          className="search-result-item"
                          onClick={handleResultClick}
                        >
                          <div
                            className="search-result-icon"
                            style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="search-result-info">
                            <div className="search-result-title">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="search-result-meta">
                              {c.email || c.phone || "Nessun contatto"}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Interviews */}
                  {results.interviews?.length > 0 && (
                    <div className="search-results-section">
                      <div className="search-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Colloqui
                      </div>
                      {results.interviews.map((i) => (
                        <Link
                          key={`interview-${i.id}`}
                          to={`/candidates/${i.candidate_id}`}
                          className="search-result-item"
                          onClick={handleResultClick}
                        >
                          <div
                            className="search-result-icon"
                            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                          <div className="search-result-info">
                            <div className="search-result-title">
                              {i.first_name} {i.last_name}
                            </div>
                            <div className="search-result-meta">
                              {formatDate(i.scheduled_at)} - {i.status}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Meetings */}
                  {results.meetings?.length > 0 && (
                    <div className="search-results-section">
                      <div className="search-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Riunioni
                      </div>
                      {results.meetings.map((m) => (
                        <Link
                          key={`meeting-${m.id}`}
                          to="/room-calendar"
                          className="search-result-item"
                          onClick={handleResultClick}
                        >
                          <div
                            className="search-result-icon"
                            style={{
                              background: m.room_color || "linear-gradient(135deg, #10B981, #059669)",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          </div>
                          <div className="search-result-info">
                            <div className="search-result-title">{m.title}</div>
                            <div className="search-result-meta">
                              {m.room_name} - {formatDate(m.start_time)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Vehicles */}
                  {results.vehicles?.length > 0 && (
                    <div className="search-results-section">
                      <div className="search-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                          <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                          <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1" />
                        </svg>
                        Veicoli
                      </div>
                      {results.vehicles.map((v) => (
                        <Link
                          key={`vehicle-${v.id}`}
                          to="/vehicles"
                          className="search-result-item"
                          onClick={handleResultClick}
                        >
                          <div
                            className="search-result-icon"
                            style={{
                              background: v.color || "linear-gradient(135deg, #F59E0B, #D97706)",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1" />
                            </svg>
                          </div>
                          <div className="search-result-info">
                            <div className="search-result-title">
                              {v.brand} {v.model}
                            </div>
                            <div className="search-result-meta">
                              {v.plate} - {v.fuel_type || "N/A"}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Vehicle Bookings */}
                  {results.bookings?.length > 0 && (
                    <div className="search-results-section">
                      <div className="search-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Prenotazioni Veicoli
                      </div>
                      {results.bookings.map((b) => (
                        <Link
                          key={`booking-${b.id}`}
                          to="/vehicle-calendar"
                          className="search-result-item"
                          onClick={handleResultClick}
                        >
                          <div
                            className="search-result-icon"
                            style={{
                              background: b.vehicle_color || "linear-gradient(135deg, #EC4899, #DB2777)",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1" />
                            </svg>
                          </div>
                          <div className="search-result-info">
                            <div className="search-result-title">{b.driver_name}</div>
                            <div className="search-result-meta">
                              {b.plate} - {formatDate(b.start_time)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
