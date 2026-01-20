import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function VehicleCalendarPage() {
  const authContext = useAuth();
  const user = authContext?.user;

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState("all");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(null);

  // Form state
  const [formVehicleId, setFormVehicleId] = useState("");
  const [formDriverName, setFormDriverName] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formKmStart, setFormKmStart] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Return form state
  const [returnKmEnd, setReturnKmEnd] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async () => {
    try {
      const [vehiclesRes, bookingsRes] = await Promise.all([
        api.get("/vehicles?active=true"),
        api.get("/vehicle-bookings")
      ]);
      setVehicles(vehiclesRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error("Errore caricamento dati", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Get starting day (0 = Sunday, we want Monday = 0)
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  // Filter bookings by selected vehicle
  const filteredBookings = selectedVehicle === "all"
    ? bookings
    : bookings.filter(b => b.vehicle_id === parseInt(selectedVehicle));

  // Group bookings by date
  const bookingsByDate = {};
  filteredBookings.forEach(booking => {
    const date = new Date(booking.start_time);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!bookingsByDate[dateKey]) {
      bookingsByDate[dateKey] = [];
    }
    bookingsByDate[dateKey].push(booking);
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const resetForm = () => {
    setFormVehicleId("");
    setFormDriverName("");
    setFormDestination("");
    setFormPurpose("");
    setFormDate("");
    setFormStartTime("");
    setFormEndDate("");
    setFormEndTime("");
    setFormKmStart("");
    setFormNotes("");
    setFormError("");
    setEditBooking(null);
    setShowForm(false);
  };

  const openNewBooking = (day = null) => {
    resetForm();
    if (day) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setFormDate(dateStr);
    }
    if (selectedVehicle !== "all") {
      setFormVehicleId(selectedVehicle);
      const vehicle = vehicles.find(v => v.id === parseInt(selectedVehicle));
      if (vehicle) {
        setFormKmStart(vehicle.current_km || "");
      }
    }
    setShowForm(true);
  };

  const openEditBooking = (booking) => {
    const startDate = new Date(booking.start_time);

    setEditBooking(booking);
    setFormVehicleId(String(booking.vehicle_id));
    setFormDriverName(booking.driver_name);
    setFormDestination(booking.destination || "");
    setFormPurpose(booking.purpose || "");
    setFormDate(startDate.toISOString().split("T")[0]);
    setFormStartTime(startDate.toTimeString().slice(0, 5));

    if (booking.end_time) {
      const endDate = new Date(booking.end_time);
      setFormEndDate(endDate.toISOString().split("T")[0]);
      setFormEndTime(endDate.toTimeString().slice(0, 5));
    } else {
      setFormEndDate("");
      setFormEndTime("");
    }

    setFormKmStart(booking.km_start || "");
    setFormNotes(booking.notes || "");
    setFormError("");
    setShowForm(true);
  };

  const handleVehicleChange = (vehicleId) => {
    setFormVehicleId(vehicleId);
    if (vehicleId) {
      const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
      if (vehicle && !formKmStart) {
        setFormKmStart(vehicle.current_km || "");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const startTime = `${formDate}T${formStartTime || "08:00"}:00`;
    let endTime = null;
    if (formEndDate && formEndTime) {
      endTime = `${formEndDate}T${formEndTime}:00`;
    }

    const payload = {
      vehicle_id: parseInt(formVehicleId),
      driver_name: formDriverName,
      destination: formDestination || null,
      purpose: formPurpose || null,
      start_time: startTime,
      end_time: endTime,
      km_start: formKmStart ? parseInt(formKmStart) : null,
      notes: formNotes || null
    };

    try {
      if (editBooking) {
        await api.put(`/vehicle-bookings/${editBooking.id}`, payload);
      } else {
        await api.post("/vehicle-bookings", payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError("Il veicolo è già prenotato in questo periodo. Scegli un altro orario o un altro veicolo.");
      } else {
        setFormError(err.response?.data?.message || "Errore nel salvataggio");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/vehicle-bookings/${id}`);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  const handleReturn = async () => {
    if (!showReturnModal) return;
    setReturnLoading(true);

    try {
      await api.patch(`/vehicle-bookings/${showReturnModal.id}/return`, {
        km_end: returnKmEnd ? parseInt(returnKmEnd) : null,
        return_notes: returnNotes || null
      });
      setShowReturnModal(null);
      setReturnKmEnd("");
      setReturnNotes("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nella restituzione");
    } finally {
      setReturnLoading(false);
    }
  };

  const getVehicleColor = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.color || "#3B82F6";
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const renderDays = () => {
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${month}-${day}`;
      const dayBookings = bookingsByDate[dateKey] || [];
      const hasBookings = dayBookings.length > 0;
      const isSelected = selectedDay === day;

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasBookings ? "has-interviews" : ""} ${isToday(day) ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDay(isSelected ? null : day)}
        >
          <span className="day-number">{day}</span>
          {hasBookings && (
            <div className="day-interviews">
              {dayBookings.slice(0, 3).map((booking, idx) => (
                <div
                  key={idx}
                  className={`day-interview-dot ${booking.returned ? "returned" : ""}`}
                  style={{ backgroundColor: getVehicleColor(booking.vehicle_id) }}
                >
                  <span className="dot-time">
                    {booking.plate}
                  </span>
                </div>
              ))}
              {dayBookings.length > 3 && (
                <span className="more-interviews">+{dayBookings.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateKey = selectedDay ? `${year}-${month}-${selectedDay}` : null;
  const selectedBookings = selectedDateKey
    ? (bookingsByDate[selectedDateKey] || []).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    : [];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento calendario veicoli...</div>
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Prenotazione Veicoli</h1>
            <p className="page-subtitle-modern">Prenota e gestisci i veicoli aziendali</p>
          </div>
        </div>
        <button className="btn-primary-modern" onClick={() => openNewBooking()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuova Prenotazione
        </button>
      </div>

      {/* Vehicle Filter */}
      <div className="room-filter-bar">
        <label className="room-filter-label">Filtra per veicolo:</label>
        <div className="room-filter-options">
          <button
            className={`room-filter-btn ${selectedVehicle === "all" ? "active" : ""}`}
            onClick={() => setSelectedVehicle("all")}
          >
            Tutti i veicoli
          </button>
          {vehicles.map(vehicle => (
            <button
              key={vehicle.id}
              className={`room-filter-btn ${selectedVehicle === String(vehicle.id) ? "active" : ""}`}
              onClick={() => setSelectedVehicle(String(vehicle.id))}
              style={{ "--room-color": vehicle.color || "#3B82F6" }}
            >
              <span className="room-filter-dot" style={{ backgroundColor: vehicle.color || "#3B82F6" }}></span>
              {vehicle.plate}
            </button>
          ))}
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
            </svg>
          </div>
          <h3>Nessun veicolo configurato</h3>
          <p>Contatta un amministratore per configurare i veicoli aziendali.</p>
        </div>
      ) : (
        <div className="calendar-view room-calendar">
          {/* Calendar Header */}
          <div className="calendar-header">
            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={prevMonth}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h2 className="calendar-title">{MONTHS[month]} {year}</h2>
              <button className="cal-nav-btn" onClick={nextMonth}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
            <button className="cal-today-btn" onClick={goToToday}>
              Oggi
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day names */}
            {DAYS.map(day => (
              <div key={day} className="calendar-day-name">{day}</div>
            ))}

            {/* Days */}
            {renderDays()}
          </div>

          {/* Selected Day Detail */}
          {selectedDay && (
            <div className="calendar-detail">
              <div className="calendar-detail-header">
                <h3>
                  {selectedDay} {MONTHS[month]} {year}
                </h3>
                <div className="detail-header-actions">
                  <span className="detail-count">
                    {selectedBookings.length} prenotazion{selectedBookings.length !== 1 ? "i" : "e"}
                  </span>
                  <button className="btn-add-meeting" onClick={() => openNewBooking(selectedDay)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Aggiungi
                  </button>
                </div>
              </div>

              {selectedBookings.length === 0 ? (
                <p className="no-interviews">Nessuna prenotazione per questo giorno.</p>
              ) : (
                <div className="calendar-detail-list">
                  {selectedBookings.map(booking => (
                    <div key={booking.id} className={`calendar-detail-item meeting-item ${booking.returned ? "booking-returned" : ""}`}>
                      <div
                        className="meeting-color-indicator"
                        style={{ backgroundColor: getVehicleColor(booking.vehicle_id) }}
                      ></div>
                      <div className="detail-item-time">
                        {formatDateTime(booking.start_time)}
                        {booking.end_time && (
                          <>
                            <span className="time-separator">-</span>
                            {formatDateTime(booking.end_time)}
                          </>
                        )}
                      </div>
                      <div className="detail-item-info">
                        <div className="detail-item-header">
                          <span className="detail-item-name">{booking.driver_name}</span>
                          <span className="meeting-room-badge" style={{ backgroundColor: getVehicleColor(booking.vehicle_id) }}>
                            {booking.plate}
                          </span>
                          {booking.returned ? (
                            <span className="booking-status-badge returned">Restituito</span>
                          ) : (
                            <span className="booking-status-badge active">In uso</span>
                          )}
                        </div>
                        {booking.destination && (
                          <span className="detail-item-location">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {booking.destination}
                          </span>
                        )}
                        {booking.purpose && (
                          <div className="booking-purpose">{booking.purpose}</div>
                        )}
                        {(booking.km_start || booking.km_end) && (
                          <div className="booking-km">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                            {booking.km_start && <span>Partenza: {booking.km_start.toLocaleString()} km</span>}
                            {booking.km_end && <span> | Rientro: {booking.km_end.toLocaleString()} km</span>}
                          </div>
                        )}
                        {booking.notes && (
                          <div className="detail-item-feedback">{booking.notes}</div>
                        )}
                        {booking.return_notes && (
                          <div className="detail-item-feedback return-note">
                            <strong>Note rientro:</strong> {booking.return_notes}
                          </div>
                        )}
                      </div>
                      <div className="detail-item-actions">
                        {!booking.returned && (
                          <button
                            className="btn-icon-small btn-return"
                            title="Registra restituzione"
                            onClick={() => {
                              setShowReturnModal(booking);
                              setReturnKmEnd("");
                              setReturnNotes("");
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 10 4 15 9 20"/>
                              <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                            </svg>
                          </button>
                        )}
                        <button
                          className="btn-icon-small"
                          title="Modifica"
                          onClick={() => openEditBooking(booking)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn-icon-small btn-danger-icon"
                          title="Elimina"
                          onClick={() => setDeleteConfirm(booking)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editBooking ? "Modifica Prenotazione" : "Nuova Prenotazione"}</h2>
              <button className="modal-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modern-form">
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                    </svg>
                    Veicolo *
                  </label>
                  <select
                    className="form-input"
                    value={formVehicleId}
                    onChange={e => handleVehicleChange(e.target.value)}
                    required
                    disabled={formLoading}
                  >
                    <option value="">Seleziona un veicolo</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Conducente *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formDriverName}
                    onChange={e => setFormDriverName(e.target.value)}
                    required
                    disabled={formLoading}
                    placeholder="Nome e cognome"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Destinazione
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formDestination}
                    onChange={e => setFormDestination(e.target.value)}
                    disabled={formLoading}
                    placeholder="Es. Milano, cliente ABC"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Km alla partenza
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formKmStart}
                    onChange={e => setFormKmStart(e.target.value)}
                    disabled={formLoading}
                    min="0"
                    placeholder="Chilometri"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="17" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Motivo del viaggio
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  disabled={formLoading}
                  placeholder="Es. Visita cliente, consegna materiale"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Data partenza *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Ora partenza
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Data rientro previsto
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Ora rientro previsto
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="17" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Note
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  disabled={formLoading}
                  rows="2"
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div className="form-actions-row">
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Salvataggio..." : (editBooking ? "Aggiorna" : "Prenota")}
                </button>
                <button type="button" className="btn-cancel" onClick={resetForm} disabled={formLoading}>
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(null)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registra Restituzione</h2>
              <button className="modal-close" onClick={() => setShowReturnModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modern-form">
              <p className="return-info">
                Veicolo: <strong>{showReturnModal.plate}</strong><br/>
                Conducente: <strong>{showReturnModal.driver_name}</strong>
              </p>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  Km al rientro
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={returnKmEnd}
                  onChange={e => setReturnKmEnd(e.target.value)}
                  disabled={returnLoading}
                  min={showReturnModal.km_start || 0}
                  placeholder={showReturnModal.km_start ? `Min: ${showReturnModal.km_start}` : "Chilometri"}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="17" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Note rientro
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  disabled={returnLoading}
                  rows="2"
                  placeholder="Es. Rifornimento effettuato, problema segnalato..."
                />
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleReturn}
                  disabled={returnLoading}
                >
                  {returnLoading ? "Salvataggio..." : "Conferma Restituzione"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowReturnModal(null)}
                  disabled={returnLoading}
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Conferma Eliminazione</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Sei sicuro di voler eliminare la prenotazione di <strong>{deleteConfirm.driver_name}</strong> per il veicolo <strong>{deleteConfirm.plate}</strong>?</p>
              <p className="text-muted">Questa azione non può essere annullata.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Annulla
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
