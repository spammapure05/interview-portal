import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../authContext";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function RoomCalendarPage() {
  const authContext = useAuth();
  const user = authContext?.user;

  const [rooms, setRooms] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState("all");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formRoomId, setFormRoomId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formOrganizer, setFormOrganizer] = useState("");
  const [formParticipants, setFormParticipants] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async () => {
    try {
      const [roomsRes, meetingsRes] = await Promise.all([
        api.get("/rooms?active=true"),
        api.get("/room-meetings")
      ]);
      setRooms(roomsRes.data);
      setMeetings(meetingsRes.data);
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

  // Filter meetings by selected room
  const filteredMeetings = selectedRoom === "all"
    ? meetings
    : meetings.filter(m => m.room_id === parseInt(selectedRoom));

  // Group meetings by date
  const meetingsByDate = {};
  filteredMeetings.forEach(meeting => {
    const date = new Date(meeting.start_time);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!meetingsByDate[dateKey]) {
      meetingsByDate[dateKey] = [];
    }
    meetingsByDate[dateKey].push(meeting);
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
    setFormRoomId("");
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormOrganizer("");
    setFormParticipants("");
    setFormError("");
    setEditMeeting(null);
    setShowForm(false);
  };

  const openNewMeeting = (day = null) => {
    resetForm();
    if (day) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setFormDate(dateStr);
    }
    if (selectedRoom !== "all") {
      setFormRoomId(selectedRoom);
    }
    setShowForm(true);
  };

  const openEditMeeting = (meeting) => {
    const startDate = new Date(meeting.start_time);
    const endDate = new Date(meeting.end_time);

    setEditMeeting(meeting);
    setFormRoomId(String(meeting.room_id));
    setFormTitle(meeting.title);
    setFormDescription(meeting.description || "");
    setFormDate(startDate.toISOString().split("T")[0]);
    setFormStartTime(startDate.toTimeString().slice(0, 5));
    setFormEndTime(endDate.toTimeString().slice(0, 5));
    setFormOrganizer(meeting.organizer || "");
    setFormParticipants(meeting.participants || "");
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const startTime = `${formDate}T${formStartTime}:00`;
    const endTime = `${formDate}T${formEndTime}:00`;

    const payload = {
      room_id: parseInt(formRoomId),
      title: formTitle,
      description: formDescription || null,
      start_time: startTime,
      end_time: endTime,
      organizer: formOrganizer || null,
      participants: formParticipants || null
    };

    try {
      if (editMeeting) {
        await api.put(`/room-meetings/${editMeeting.id}`, payload);
      } else {
        await api.post("/room-meetings", payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError("La sala è già occupata in questo orario. Scegli un altro orario o un'altra sala.");
      } else {
        setFormError(err.response?.data?.message || "Errore nel salvataggio");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/room-meetings/${id}`);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  const getRoomColor = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.color || "#3B82F6";
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
      const dayMeetings = meetingsByDate[dateKey] || [];
      const hasMeetings = dayMeetings.length > 0;
      const isSelected = selectedDay === day;

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasMeetings ? "has-interviews" : ""} ${isToday(day) ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDay(isSelected ? null : day)}
        >
          <span className="day-number">{day}</span>
          {hasMeetings && (
            <div className="day-interviews">
              {dayMeetings.slice(0, 3).map((meeting, idx) => (
                <div
                  key={idx}
                  className="day-interview-dot"
                  style={{ backgroundColor: getRoomColor(meeting.room_id) }}
                >
                  <span className="dot-time">
                    {new Date(meeting.start_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {dayMeetings.length > 3 && (
                <span className="more-interviews">+{dayMeetings.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateKey = selectedDay ? `${year}-${month}-${selectedDay}` : null;
  const selectedMeetings = selectedDateKey
    ? (meetingsByDate[selectedDateKey] || []).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    : [];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento calendario sale...</div>
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
            <h1 className="page-title-modern">Calendario Sale Meeting</h1>
            <p className="page-subtitle-modern">Prenota e visualizza le riunioni nelle sale</p>
          </div>
        </div>
        {user && user.role !== "viewer" && (
          <button className="btn-primary-modern" onClick={() => openNewMeeting()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuova Riunione
          </button>
        )}
      </div>

      {/* Room Filter */}
      <div className="room-filter-bar">
        <label className="room-filter-label">Filtra per sala:</label>
        <div className="room-filter-options">
          <button
            className={`room-filter-btn ${selectedRoom === "all" ? "active" : ""}`}
            onClick={() => setSelectedRoom("all")}
          >
            Tutte le sale
          </button>
          {rooms.map(room => (
            <button
              key={room.id}
              className={`room-filter-btn ${selectedRoom === String(room.id) ? "active" : ""}`}
              onClick={() => setSelectedRoom(String(room.id))}
              style={{
                "--room-color": room.color || "#3B82F6"
              }}
            >
              <span className="room-filter-dot" style={{ backgroundColor: room.color || "#3B82F6" }}></span>
              {room.name}
            </button>
          ))}
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h3>Nessuna sala configurata</h3>
          <p>Contatta un amministratore per configurare le sale meeting.</p>
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
                    {selectedMeetings.length} riunion{selectedMeetings.length !== 1 ? "i" : "e"}
                  </span>
                  <button className="btn-add-meeting" onClick={() => openNewMeeting(selectedDay)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Aggiungi
                  </button>
                </div>
              </div>

              {selectedMeetings.length === 0 ? (
                <p className="no-interviews">Nessuna riunione programmata per questo giorno.</p>
              ) : (
                <div className="calendar-detail-list">
                  {selectedMeetings.map(meeting => (
                    <div key={meeting.id} className="calendar-detail-item meeting-item">
                      <div
                        className="meeting-color-indicator"
                        style={{ backgroundColor: getRoomColor(meeting.room_id) }}
                      ></div>
                      <div className="detail-item-time">
                        {new Date(meeting.start_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        <span className="time-separator">-</span>
                        {new Date(meeting.end_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="detail-item-info">
                        <div className="detail-item-header">
                          <span className="detail-item-name">{meeting.title}</span>
                          <span className="meeting-room-badge" style={{ backgroundColor: getRoomColor(meeting.room_id) }}>
                            {meeting.room_name}
                          </span>
                        </div>
                        {meeting.organizer && (
                          <span className="detail-item-location">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            {meeting.organizer}
                          </span>
                        )}
                        {meeting.description && (
                          <div className="detail-item-feedback">
                            {meeting.description}
                          </div>
                        )}
                      </div>
                      {user && user.role !== "viewer" && (
                        <div className="detail-item-actions">
                          <button
                            className="btn-icon-small"
                            title="Modifica"
                            onClick={() => openEditMeeting(meeting)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            className="btn-icon-small btn-danger-icon"
                            title="Elimina"
                            onClick={() => setDeleteConfirm(meeting)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meeting Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMeeting ? "Modifica Riunione" : "Nuova Riunione"}</h2>
              <button className="modal-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modern-form">
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  Sala *
                </label>
                <select
                  className="form-input"
                  value={formRoomId}
                  onChange={e => setFormRoomId(e.target.value)}
                  required
                  disabled={formLoading}
                >
                  <option value="">Seleziona una sala</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} {room.capacity ? `(max ${room.capacity} persone)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="17" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Titolo Riunione *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder="Es. Meeting settimanale"
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
                    Data *
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Ora Inizio *
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
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
                    Ora Fine *
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Organizzatore
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formOrganizer}
                  onChange={e => setFormOrganizer(e.target.value)}
                  disabled={formLoading}
                  placeholder="Es. Mario Rossi"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Partecipanti
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formParticipants}
                  onChange={e => setFormParticipants(e.target.value)}
                  disabled={formLoading}
                  placeholder="Es. Team sviluppo, Marketing"
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
                  Note
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  disabled={formLoading}
                  rows="3"
                  placeholder="Argomenti da discutere, link utili..."
                />
              </div>

              <div className="form-actions-row">
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Salvataggio..." : (editMeeting ? "Aggiorna" : "Prenota")}
                </button>
                <button type="button" className="btn-cancel" onClick={resetForm} disabled={formLoading}>
                  Annulla
                </button>
              </div>
            </form>
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
              <p>Sei sicuro di voler eliminare la riunione <strong>{deleteConfirm.title}</strong>?</p>
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
