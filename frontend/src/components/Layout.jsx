import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="logo">Interview Portal</span>
          {user && (
            <nav>
              <Link to="/">Dashboard</Link>
              <Link to="/calendar">Calendario</Link>
              {user.role === "admin" && <Link to="/candidates">Candidati</Link>}
            </nav>
          )}
        </div>
        {user && (
          <div className="app-header-right">
            <span className="user-pill">
              {user.email} • <strong>{user.role.toUpperCase()}</strong>
            </span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
