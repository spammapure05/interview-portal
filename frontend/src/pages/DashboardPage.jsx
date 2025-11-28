import { useAuth } from "../authContext";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user.role === "secretary") {
    return (
      <div>
        <h1>Dashboard Segreteria</h1>
        <p>
          Qui puoi gestire i nuovi candidati e il calendario dei colloqui.
        </p>
        <ul>
          <li>
            <Link to="/calendar">Vai al Calendario colloqui</Link>
          </li>
          <li>
            <Link to="/candidates">Inserisci un nuovo candidato</Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard Admin</h1>
      <p>Panoramica generale dei colloqui e dei candidati.</p>
      <ul>
        <li>
          <Link to="/calendar">Calendario colloqui</Link>
        </li>
        <li>
          <Link to="/candidates">Gestisci candidati</Link>
        </li>
      </ul>
    </div>
  );
}
