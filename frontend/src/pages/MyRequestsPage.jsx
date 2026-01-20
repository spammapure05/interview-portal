import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get("/booking-requests");
      setRequests(res.data);
    } catch (err) {
      setError("Errore caricamento richieste");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCounter = async (id) => {
    if (!confirm("Accettare la controproposta?")) return;
    try {
      await api.put(`/booking-requests/${id}/accept-counter`);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const handleRejectCounter = async (id) => {
    if (!confirm("Rifiutare la controproposta?")) return;
    try {
      await api.put(`/booking-requests/${id}/reject-counter`);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Annullare questa richiesta?")) return;
    try {
      await api.delete(`/booking-requests/${id}`);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "In attesa", color: "#F59E0B", bg: "#FEF3C7" },
      approved: { label: "Approvata", color: "#10B981", bg: "#D1FAE5" },
      rejected: { label: "Rifiutata", color: "#EF4444", bg: "#FEE2E2" },
      counter_proposed: { label: "Controproposta", color: "#8B5CF6", bg: "#EDE9FE" },
      counter_accepted: { label: "Confermata", color: "#10B981", bg: "#D1FAE5" },
      counter_rejected: { label: "Controp. Rifiutata", color: "#EF4444", bg: "#FEE2E2" },
      cancelled: { label: "Annullata", color: "#6B7280", bg: "#F3F4F6" }
    };
    const s = statusMap[status] || { label: status, color: "#6B7280", bg: "#F3F4F6" };
    return (
      <span className="status-badge" style={{ color: s.color, background: s.bg }}>
        {s.label}
      </span>
    );
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending" || r.status === "counter_proposed";
    if (filter === "completed") return ["approved", "counter_accepted", "rejected", "counter_rejected", "cancelled"].includes(r.status);
    return r.request_type === filter;
  });

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento richieste...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Le Mie Richieste</h1>
            <p className="page-subtitle-modern">Storico e stato delle tue richieste di prenotazione</p>
          </div>
        </div>
        <Link to="/request-booking" className="btn-primary-modern">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuova Richiesta
        </Link>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Filtri */}
      <div className="requests-filter-bar">
        <button
          className={`requests-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <span className="filter-count">{requests.length}</span>
          Tutte
        </button>
        <button
          className={`requests-filter-btn ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          <span className="filter-count">{requests.filter(r => r.status === "pending" || r.status === "counter_proposed").length}</span>
          In Attesa
        </button>
        <button
          className={`requests-filter-btn ${filter === "room" ? "active" : ""}`}
          onClick={() => setFilter("room")}
        >
          <span className="filter-count">{requests.filter(r => r.request_type === "room").length}</span>
          Sale
        </button>
        <button
          className={`requests-filter-btn ${filter === "vehicle" ? "active" : ""}`}
          onClick={() => setFilter("vehicle")}
        >
          <span className="filter-count">{requests.filter(r => r.request_type === "vehicle").length}</span>
          Veicoli
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h3>Nessuna richiesta</h3>
          <p>Non hai ancora effettuato richieste di prenotazione</p>
          <Link to="/request-booking" className="btn-primary-modern">Nuova Richiesta</Link>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="request-type-icon" style={{ background: request.request_type === "room" ? (request.room_color || "#10B981") : (request.vehicle_color || "#F59E0B") }}>
                  {request.request_type === "room" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                    </svg>
                  )}
                </div>
                <div className="request-main-info">
                  <h3>
                    {request.request_type === "room"
                      ? (request.meeting_title || request.room_name || "Sala Riunioni")
                      : (`${request.brand} ${request.model}` || "Veicolo")}
                  </h3>
                  <p className="request-resource">
                    {request.request_type === "room"
                      ? request.room_name
                      : `${request.plate} - ${request.destination || "N/A"}`}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="request-details">
                <div className="request-detail">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{formatDateTime(request.requested_start)}</span>
                  {request.requested_end && (
                    <span> - {formatDateTime(request.requested_end)}</span>
                  )}
                </div>
                <div className="request-detail">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Richiesta il {formatDateTime(request.created_at)}</span>
                </div>
              </div>

              {/* Controproposta */}
              {request.status === "counter_proposed" && (
                <div className="counter-proposal-box">
                  <h4>Controproposta dall'amministratore</h4>
                  <p className="counter-reason">{request.counter_reason}</p>
                  <div className="counter-details">
                    {request.counter_room_name && request.counter_room_id !== request.room_id && (
                      <p><strong>Nuova sala:</strong> {request.counter_room_name}</p>
                    )}
                    {request.counter_plate && request.counter_vehicle_id !== request.vehicle_id && (
                      <p><strong>Nuovo veicolo:</strong> {request.counter_brand} {request.counter_model} ({request.counter_plate})</p>
                    )}
                    {request.counter_start && request.counter_start !== request.requested_start && (
                      <p><strong>Nuova data/ora:</strong> {formatDateTime(request.counter_start)} - {formatDateTime(request.counter_end)}</p>
                    )}
                  </div>
                  <div className="counter-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleAcceptCounter(request.id)}
                    >
                      Accetta
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRejectCounter(request.id)}
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              )}

              {/* Motivo rifiuto */}
              {request.status === "rejected" && request.rejection_reason && (
                <div className="rejection-box">
                  <h4>Motivo del rifiuto</h4>
                  <p>{request.rejection_reason}</p>
                </div>
              )}

              {/* Azioni */}
              {request.status === "pending" && (
                <div className="request-actions">
                  <button
                    className="btn btn-sm btn-ghost btn-danger"
                    onClick={() => handleCancel(request.id)}
                  >
                    Annulla Richiesta
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
