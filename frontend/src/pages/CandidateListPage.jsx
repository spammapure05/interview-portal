import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import CandidateForm from "../components/CandidateForm";

export default function CandidateListPage() {
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    const res = await api.get("/candidates");
    setCandidates(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Filtro ricerca
  const filteredCandidates = candidates.filter(c => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      email.includes(search) ||
      phone.includes(search)
    );
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Gestione Candidati</h1>
            <p className="page-subtitle-modern">Archivia e gestisci i profili dei candidati</p>
          </div>
        </div>
      </div>

      <div className="page-layout">
        {/* Sidebar - Form */}
        <aside className="page-sidebar-modern">
          <CandidateForm onSaved={load} />
        </aside>

        {/* Main Content */}
        <div className="page-main">
          {/* Search */}
          <div className="filters-bar">
            <div className="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon-svg">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Cerca per nome, email o telefono..."
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
          </div>

          {/* Results Count */}
          <div className="results-info">
            <span className="results-count-modern">
              {filteredCandidates.length} candidat{filteredCandidates.length !== 1 ? "i" : "o"}
            </span>
          </div>

          {/* Candidates List */}
          {filteredCandidates.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Nessun candidato trovato</h3>
              <p>
                {candidates.length === 0
                  ? "Non ci sono candidati registrati. Inizia aggiungendo il primo!"
                  : "Nessun candidato corrisponde alla tua ricerca."}
              </p>
            </div>
          ) : (
            <div className="candidates-grid">
              {filteredCandidates.map(c => (
                <Link to={`/candidates/${c.id}`} key={c.id} className="candidate-card-modern">
                  <div className="candidate-card-header">
                    <div className="candidate-avatar-large">
                      {c.first_name?.charAt(0)}{c.last_name?.charAt(0)}
                    </div>
                    <div className="candidate-main-info">
                      <h3 className="candidate-fullname">{c.last_name} {c.first_name}</h3>
                      {c.email && (
                        <span className="candidate-email">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="candidate-card-body">
                    {c.phone && (
                      <div className="candidate-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.notes && (
                      <div className="candidate-notes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>{c.notes.length > 80 ? c.notes.substring(0, 80) + "..." : c.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="candidate-card-footer">
                    <span className="view-profile">
                      Visualizza profilo
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </span>
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
