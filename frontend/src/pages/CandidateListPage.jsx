import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import CandidateForm from "../components/CandidateForm";

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
      <h1>Candidati</h1>

      <CandidateForm onSaved={load} />

      <ul className="list">
        {candidates.map(c => (
          <li key={c.id} className="card">
            <Link to={`/candidates/${c.id}`}>
              {c.last_name} {c.first_name}
            </Link>
            {c.email && <div>Email: {c.email}</div>}
            {c.phone && <div>Telefono: {c.phone}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
