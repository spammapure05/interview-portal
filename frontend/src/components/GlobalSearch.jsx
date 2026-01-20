import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setShowDropdown(false);
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
        setShowDropdown(true);
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
    setShowDropdown(false);
    setQuery("");
  };

  const hasResults = results && (
    results.candidates?.length > 0 ||
    results.interviews?.length > 0 ||
    results.meetings?.length > 0 ||
    results.vehicles?.length > 0 ||
    results.bookings?.length > 0
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`global-search ${isFocused ? 'focused' : ''}`} ref={searchRef}>
      <div className="search-input-container">
        <div className="search-icon-animated">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div className="search-pulse"></div>
          <div className="search-pulse delay"></div>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Cerca ovunque..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (query.length >= 2 && results) setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
        />
        {!query && !isFocused && (
          <span className="search-hint">
            <kbd>Ctrl</kbd>+<kbd>K</kbd>
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="search-results-dropdown">
          {loading && (
            <div className="search-no-results">
              <p>Ricerca in corso...</p>
            </div>
          )}

          {!loading && !hasResults && query.length >= 2 && (
            <div className="search-no-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p>Nessun risultato per "{query}"</p>
            </div>
          )}

          {!loading && hasResults && (
            <>
              {/* Candidates */}
              {results.candidates?.length > 0 && (
                <div className="search-results-section">
                  <div className="search-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Candidati
                  </div>
                  {results.candidates.map(c => (
                    <Link
                      key={`candidate-${c.id}`}
                      to={`/candidates/${c.id}`}
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-icon" style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{c.first_name} {c.last_name}</div>
                        <div className="search-result-meta">{c.email || c.phone || "Nessun contatto"}</div>
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
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Colloqui
                  </div>
                  {results.interviews.map(i => (
                    <Link
                      key={`interview-${i.id}`}
                      to={`/candidates/${i.candidate_id}`}
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-icon" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{i.first_name} {i.last_name}</div>
                        <div className="search-result-meta">{formatDate(i.scheduled_at)} - {i.status}</div>
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
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Riunioni
                  </div>
                  {results.meetings.map(m => (
                    <Link
                      key={`meeting-${m.id}`}
                      to="/room-calendar"
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-icon" style={{ background: m.room_color || "linear-gradient(135deg, #10B981, #059669)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{m.title}</div>
                        <div className="search-result-meta">{m.room_name} - {formatDate(m.start_time)}</div>
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
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                    </svg>
                    Veicoli
                  </div>
                  {results.vehicles.map(v => (
                    <Link
                      key={`vehicle-${v.id}`}
                      to="/vehicles"
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-icon" style={{ background: v.color || "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                          <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                          <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                        </svg>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{v.brand} {v.model}</div>
                        <div className="search-result-meta">{v.plate} - {v.fuel_type || "N/A"}</div>
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
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Prenotazioni Veicoli
                  </div>
                  {results.bookings.map(b => (
                    <Link
                      key={`booking-${b.id}`}
                      to="/vehicle-calendar"
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-result-icon" style={{ background: b.vehicle_color || "linear-gradient(135deg, #EC4899, #DB2777)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                          <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                          <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                        </svg>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{b.driver_name}</div>
                        <div className="search-result-meta">{b.plate} - {formatDate(b.start_time)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
