import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import CandidateListPage from "./pages/CandidateListPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import Layout from "./components/Layout";

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuth();
  
  // While auth is loading, show a loading screen
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "1.2rem", color: "#475569" }}>
        Caricamento...
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="candidates" element={<CandidateListPage />} />
        <Route path="candidates/:id" element={<CandidateDetailPage />} />
      </Route>
    </Routes>
  );
}
