import { useState, useEffect } from "react";
import api from "../api";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'reject' or 'counter'
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Counter proposal data
  const [rooms, setRooms] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [counterData, setCounterData] = useState({
    counter_room_id: "",
    counter_vehicle_id: "",
    counter_start: "",
    counter_end: "",
    counter_reason: "",
    rejection_reason: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, roomsRes, vehiclesRes] = await Promise.all([
        api.get("/booking-requests"),
        api.get("/rooms"),
        api.get("/vehicles")
      ]);
      setRequests(requestsRes.data);
      setRooms(roomsRes.data.filter(r => r.active));
      setVehicles(vehiclesRes.data.filter(v => v.active));
    } catch (err) {
      setError("Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm("Approvare questa richiesta?")) return;
    try {
      await api.put(`/booking-requests/${id}/approve`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setModalType("reject");
    setCounterData({ ...counterData, rejection_reason: "" });
    setShowModal(true);
  };

  const openCounterModal = (request) => {
    setSelectedRequest(request);
    setModalType("counter");
    setCounterData({
      counter_room_id: request.room_id || "",
      counter_vehicle_id: request.vehicle_id || "",
      counter_start: request.requested_start || "",
      counter_end: request.requested_end || "",
      counter_reason: "",
      rejection_reason: ""
    });
    setShowModal(true);
  };

  const handleReject = async () => {
    if (!counterData.rejection_reason.trim()) {
      alert("Inserisci il motivo del rifiuto");
      return;
    }
    try {
      await api.put(`/booking-requests/${selectedRequest.id}/reject`, {
        rejection_reason: counterData.rejection_reason
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const handleCounter = async () => {
    if (!counterData.counter_reason.trim()) {
      alert("Inserisci il motivo della controproposta");
      return;
    }
    try {
      await api.put(`/booking-requests/${selectedRequest.id}/counter`, counterData);
      setShowModal(false);
      loadData();
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
    if (filter === "pending") return r.status === "pending" || r.status === "counter_rejected";
    if (filter === "counter") return r.status === "counter_proposed";
    return r.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === "pending" || r.status === "counter_rejected").length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>
            Gestione Richieste
            {pendingCount > 0 && (
              <span className="badge-count" style={{ background: "#F59E0B", color: "white", marginLeft: "0.5rem", padding: "0.25rem 0.5rem", borderRadius: "999px", fontSize: "0.875rem" }}>
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="page-subtitle">Approva o rifiuta le richieste di prenotazione</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filtri */}
      <div className="filter-tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`filter-tab ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Da Gestire ({pendingCount})
        </button>
        <button
          className={`filter-tab ${filter === "counter" ? "active" : ""}`}
          onClick={() => setFilter("counter")}
        >
          In Attesa Risposta ({requests.filter(r => r.status === "counter_proposed").length})
        </button>
        <button
          className={`filter-tab ${filter === "approved" ? "active" : ""}`}
          onClick={() => setFilter("approved")}
        >
          Approvate
        </button>
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tutte ({requests.length})
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h3>Nessuna richiesta</h3>
          <p>{filter === "pending" ? "Non ci sono richieste da gestire" : "Nessuna richiesta trovata"}</p>
        </div>
      ) : (
        <div className="admin-requests-list">
          {filteredRequests.map(request => (
            <div key={request.id} className="admin-request-card">
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
                      ? (request.meeting_title || "Riunione")
                      : (request.destination || "Trasferta")}
                  </h3>
                  <p className="request-requester">
                    Richiesto da: <strong>{request.requester_email}</strong>
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="request-info-grid">
                <div className="info-item">
                  <label>Risorsa</label>
                  <span>
                    {request.request_type === "room"
                      ? request.room_name
                      : `${request.brand} ${request.model} (${request.plate})`}
                  </span>
                </div>
                <div className="info-item">
                  <label>Data/Ora</label>
                  <span>
                    {formatDateTime(request.requested_start)}
                    {request.requested_end && ` - ${formatDateTime(request.requested_end)}`}
                  </span>
                </div>
                {request.request_type === "vehicle" && request.driver_name && (
                  <div className="info-item">
                    <label>Conducente</label>
                    <span>{request.driver_name}</span>
                  </div>
                )}
                {request.request_type === "room" && request.meeting_description && (
                  <div className="info-item full-width">
                    <label>Descrizione</label>
                    <span>{request.meeting_description}</span>
                  </div>
                )}
                {request.request_type === "vehicle" && request.purpose && (
                  <div className="info-item full-width">
                    <label>Motivo</label>
                    <span>{request.purpose}</span>
                  </div>
                )}
              </div>

              {/* Status-specific info */}
              {request.status === "counter_proposed" && (
                <div className="counter-info-box">
                  <h4>Controproposta inviata</h4>
                  <p>{request.counter_reason}</p>
                  <p className="waiting-response">In attesa di risposta dall'utente...</p>
                </div>
              )}

              {request.status === "rejected" && (
                <div className="rejection-info-box">
                  <h4>Rifiutata</h4>
                  <p>{request.rejection_reason}</p>
                </div>
              )}

              {/* Actions for pending requests */}
              {(request.status === "pending" || request.status === "counter_rejected") && (
                <div className="admin-request-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(request.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approva
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCounterModal(request)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Controproposta
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => openRejectModal(request)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Rifiuta
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Rifiuto */}
      {showModal && modalType === "reject" && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rifiuta Richiesta</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Stai rifiutando la richiesta di <strong>{selectedRequest?.requester_email}</strong></p>
              <div className="form-group">
                <label>Motivo del rifiuto *</label>
                <textarea
                  value={counterData.rejection_reason}
                  onChange={e => setCounterData({ ...counterData, rejection_reason: e.target.value })}
                  rows={4}
                  placeholder="Spiega il motivo del rifiuto..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annulla</button>
              <button className="btn btn-danger" onClick={handleReject}>Rifiuta Richiesta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Controproposta */}
      {showModal && modalType === "counter" && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Controproposta</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Proponi una modifica alla richiesta di <strong>{selectedRequest?.requester_email}</strong></p>

              <div className="form-group">
                <label>Motivo della controproposta *</label>
                <textarea
                  value={counterData.counter_reason}
                  onChange={e => setCounterData({ ...counterData, counter_reason: e.target.value })}
                  rows={3}
                  placeholder="Spiega il motivo della modifica proposta..."
                  required
                />
              </div>

              {selectedRequest?.request_type === "room" && (
                <div className="form-group">
                  <label>Sala alternativa</label>
                  <select
                    value={counterData.counter_room_id}
                    onChange={e => setCounterData({ ...counterData, counter_room_id: e.target.value })}
                  >
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name} {room.capacity ? `(${room.capacity} posti)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedRequest?.request_type === "vehicle" && (
                <div className="form-group">
                  <label>Veicolo alternativo</label>
                  <select
                    value={counterData.counter_vehicle_id}
                    onChange={e => setCounterData({ ...counterData, counter_vehicle_id: e.target.value })}
                  >
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} ({vehicle.plate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Data/ora alternativa - Inizio</label>
                  <input
                    type="datetime-local"
                    value={counterData.counter_start}
                    onChange={e => setCounterData({ ...counterData, counter_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Data/ora alternativa - Fine</label>
                  <input
                    type="datetime-local"
                    value={counterData.counter_end}
                    onChange={e => setCounterData({ ...counterData, counter_end: e.target.value })}
                    min={counterData.counter_start}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annulla</button>
              <button className="btn btn-primary" onClick={handleCounter}>Invia Controproposta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
