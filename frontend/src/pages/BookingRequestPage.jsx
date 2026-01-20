import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function BookingRequestPage() {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState("room");
  const [rooms, setRooms] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    room_id: "",
    meeting_title: "",
    meeting_description: "",
    vehicle_id: "",
    driver_name: "",
    destination: "",
    purpose: "",
    requested_start: "",
    requested_end: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, vehiclesRes] = await Promise.all([
        api.get("/rooms"),
        api.get("/vehicles")
      ]);
      setRooms(roomsRes.data.filter(r => r.active));
      setVehicles(vehiclesRes.data.filter(v => v.active));
    } catch (err) {
      setError("Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const payload = {
        request_type: requestType,
        requested_start: formData.requested_start,
        requested_end: formData.requested_end || null
      };

      if (requestType === "room") {
        payload.room_id = parseInt(formData.room_id);
        payload.meeting_title = formData.meeting_title;
        payload.meeting_description = formData.meeting_description;
      } else {
        payload.vehicle_id = parseInt(formData.vehicle_id);
        payload.driver_name = formData.driver_name;
        payload.destination = formData.destination;
        payload.purpose = formData.purpose;
      }

      await api.post("/booking-requests", payload);
      setSuccess("Richiesta inviata con successo! Riceverai una notifica quando verrà gestita.");

      // Reset form
      setFormData({
        room_id: "",
        meeting_title: "",
        meeting_description: "",
        vehicle_id: "",
        driver_name: "",
        destination: "",
        purpose: "",
        requested_start: "",
        requested_end: ""
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/my-requests");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Errore invio richiesta");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1>Nuova Richiesta</h1>
          <p className="page-subtitle">Richiedi una sala riunioni o un veicolo aziendale</p>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: "700px" }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Tipo Richiesta */}
          <div className="form-section">
            <h3>Tipo di Richiesta</h3>
            <div className="request-type-selector">
              <button
                type="button"
                className={`type-btn ${requestType === "room" ? "active" : ""}`}
                onClick={() => setRequestType("room")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Sala Riunioni
              </button>
              <button
                type="button"
                className={`type-btn ${requestType === "vehicle" ? "active" : ""}`}
                onClick={() => setRequestType("vehicle")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                  <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                  <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                </svg>
                Veicolo
              </button>
            </div>
          </div>

          {/* Selezione risorsa */}
          <div className="form-section">
            <h3>{requestType === "room" ? "Seleziona Sala" : "Seleziona Veicolo"}</h3>

            {requestType === "room" ? (
              <div className="resource-grid">
                {rooms.map(room => (
                  <label
                    key={room.id}
                    className={`resource-card ${formData.room_id === String(room.id) ? "selected" : ""}`}
                    style={{ borderColor: formData.room_id === String(room.id) ? room.color : undefined }}
                  >
                    <input
                      type="radio"
                      name="room_id"
                      value={room.id}
                      checked={formData.room_id === String(room.id)}
                      onChange={handleChange}
                    />
                    <div className="resource-icon" style={{ background: room.color }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <div className="resource-info">
                      <strong>{room.name}</strong>
                      {room.capacity && <span>Capacità: {room.capacity} persone</span>}
                      {room.description && <span className="resource-desc">{room.description}</span>}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="resource-grid">
                {vehicles.map(vehicle => (
                  <label
                    key={vehicle.id}
                    className={`resource-card ${formData.vehicle_id === String(vehicle.id) ? "selected" : ""}`}
                    style={{ borderColor: formData.vehicle_id === String(vehicle.id) ? vehicle.color : undefined }}
                  >
                    <input
                      type="radio"
                      name="vehicle_id"
                      value={vehicle.id}
                      checked={formData.vehicle_id === String(vehicle.id)}
                      onChange={handleChange}
                    />
                    <div className="resource-icon" style={{ background: vehicle.color }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                        <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                        <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
                      </svg>
                    </div>
                    <div className="resource-info">
                      <strong>{vehicle.brand} {vehicle.model}</strong>
                      <span>{vehicle.plate}</span>
                      {vehicle.parking_location && <span className="resource-desc">Parcheggio: {vehicle.parking_location}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Data e ora */}
          <div className="form-section">
            <h3>Data e Orario</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Inizio *</label>
                <input
                  type="datetime-local"
                  name="requested_start"
                  value={formData.requested_start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fine</label>
                <input
                  type="datetime-local"
                  name="requested_end"
                  value={formData.requested_end}
                  onChange={handleChange}
                  min={formData.requested_start}
                />
              </div>
            </div>
          </div>

          {/* Dettagli specifici */}
          <div className="form-section">
            <h3>Dettagli</h3>

            {requestType === "room" ? (
              <>
                <div className="form-group">
                  <label>Titolo Riunione</label>
                  <input
                    type="text"
                    name="meeting_title"
                    value={formData.meeting_title}
                    onChange={handleChange}
                    placeholder="Es. Riunione di progetto"
                  />
                </div>
                <div className="form-group">
                  <label>Descrizione</label>
                  <textarea
                    name="meeting_description"
                    value={formData.meeting_description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Descrizione della riunione (opzionale)"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Nome Conducente</label>
                  <input
                    type="text"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleChange}
                    placeholder="Chi guiderà il veicolo"
                  />
                </div>
                <div className="form-group">
                  <label>Destinazione</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="Dove andrai"
                  />
                </div>
                <div className="form-group">
                  <label>Motivo</label>
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Motivo della trasferta (opzionale)"
                  />
                </div>
              </>
            )}
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (!formData.room_id && requestType === "room") || (!formData.vehicle_id && requestType === "vehicle") || !formData.requested_start}
            >
              {submitting ? "Invio..." : "Invia Richiesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
