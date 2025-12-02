import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import CandidateForm from "../components/CandidateForm";
import { contactIcons } from "../utils/icons";

export default function CandidateListPage() {
  const [candidates, setCandidates] = useState([]);

  const load = async () => {
    const res = await api.get("/candidates");
    setCandidates(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>{contactIcons.name} Gestione Candidati</h1>
      <p>Archivia e gestisci i profili dei candidati.</p>

      <CandidateForm onSaved={load} />

      {candidates.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "#94a3b8" }}>
            Nessun candidato registrato. Aggiungi il primo profilo!
          </p>
        </div>
      ) : (
        <ul className="list">
          {candidates.map(c => (
            <li key={c.id} className="card">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
