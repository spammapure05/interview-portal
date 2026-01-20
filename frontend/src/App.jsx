import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import CandidateListPage from "./pages/CandidateListPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import StatsPage from "./pages/StatsPage";
import UsersPage from "./pages/UsersPage";
import RoomsPage from "./pages/RoomsPage";
import RoomCalendarPage from "./pages/RoomCalendarPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehicleCalendarPage from "./pages/VehicleCalendarPage";
import GlobalCalendarPage from "./pages/GlobalCalendarPage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import BookingRequestPage from "./pages/BookingRequestPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import AdminRequestsPage from "./pages/AdminRequestsPage";
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

// Protegge le rotte dai viewer (per colloqui/candidati)
function NoViewerRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === "viewer") return <Navigate to="/" replace />;
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
        <Route path="calendar" element={<NoViewerRoute><CalendarPage /></NoViewerRoute>} />
        <Route path="candidates" element={<NoViewerRoute><CandidateListPage /></NoViewerRoute>} />
        <Route path="candidates/:id" element={<NoViewerRoute><CandidateDetailPage /></NoViewerRoute>} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="room-calendar" element={<RoomCalendarPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicle-calendar" element={<VehicleCalendarPage />} />
        <Route path="global-calendar" element={<GlobalCalendarPage />} />
        <Route path="notification-settings" element={<NotificationSettingsPage />} />
        <Route path="request-booking" element={<BookingRequestPage />} />
        <Route path="my-requests" element={<MyRequestsPage />} />
        <Route path="admin-requests" element={<AdminRequestsPage />} />
      </Route>
    </Routes>
  );
}
