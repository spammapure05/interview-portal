import { useAuth } from "../authContext";
import { Link } from "react-router-dom";
import { contactIcons } from "../utils/icons";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user.role === "secretary") {
    return (
      <div>
        <h1>📋 Dashboard Segreteria</h1>
        <p>Gestisci candidati e organizza i colloqui efficacemente.</p>
        
        <div className="list">
          <div className="card">
            <strong>{contactIcons.calendar} Calendario Colloqui</strong>
            <p>Visualizza e pianifica tutti i colloqui programmati.</p>
            <Link to="/calendar">Accedi al calendario →</Link>
          </div>
          <div className="card">
            <strong>{contactIcons.name} Nuovi Candidati</strong>
            <p>Registra e archivia i profili dei candidati.</p>
            <Link to="/candidates">Gestisci candidati →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>👨‍💼 Dashboard Admin</h1>
      <p>Panoramica completa di candidati, colloqui e valutazioni.</p>
      
      <div className="list">
        <div className="card">
          <strong>{contactIcons.calendar} Calendario Colloqui</strong>
          <p>Gestisci la pianificazione e il feedback dei colloqui.</p>
          <Link to="/calendar">Visualizza calendario →</Link>
        </div>
        <div className="card">
          <strong>{contactIcons.name} Gestisci Candidati</strong>
          <p>Accedi ai profili completi e alle valutazioni.</p>
          <Link to="/candidates">Vai a candidati →</Link>
        </div>
      </div>
    </div>
  );
}
