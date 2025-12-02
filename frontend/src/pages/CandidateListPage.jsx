import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import CandidateForm from "../components/CandidateForm";
import { contactIcons } from "../utils/icons";

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
    <div>
      <div className="page-header">
        <div className="page-title">
          <span className="title-icon" aria-hidden="true" />
          <h1>{contactIcons.name} Gestione Candidati</h1>
        </div>
        <p className="page-sub">Archivia e gestisci i profili dei candidati.</p>
      </div>

      <div className="page-container">
        {/* Sidebar - Form */}
        <div className="page-sidebar">
          <CandidateForm onSaved={load} />
        </div>

        {/* Main Content - List */}

        <div className="page-content">
          {/* Search */}
          <div className="search-row">
            <div className="search-bar large">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Cerca per nome, email o telefono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="results-count">
            {filteredCandidates.length} candidato{filteredCandidates.length !== 1 ? "i" : ""} trovato{filteredCandidates.length !== 1 ? "i" : ""}
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">👥</div>
              <p>
                {candidates.length === 0
                  ? "Nessun candidato registrato. Aggiungi il primo profilo!"
                  : "Nessun candidato corrisponde alla tua ricerca."}
              </p>
            </div>
          ) : (
            <div className="list-container">
              {filteredCandidates.map(c => (
                <div key={c.id} className="card">
                  <Link to={`/candidates/${c.id}`} style={{ fontSize: "1.05rem", fontWeight: "600" }}>
                    {contactIcons.name} {c.last_name} {c.first_name}
                  </Link>
                  {c.email && <div>{contactIcons.email} {c.email}</div>}
                  {c.phone && <div>{contactIcons.phone} {c.phone}</div>}
                  {c.notes && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.03)", fontSize: "0.9rem", color: "#64748b" }}>
                      {contactIcons.notes} {c.notes}
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
