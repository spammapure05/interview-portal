import { useEffect, useState } from "react";
import api from "../api";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const EVENT_TYPES = {
  interview: { label: "Colloqui", color: "#8B5CF6", icon: "user" },
  meeting: { label: "Riunioni", color: "#3B82F6", icon: "home" },
  vehicle: { label: "Veicoli", color: "#10B981", icon: "car" }
};

export default function GlobalCalendarPage() {
  const [interviews, setInterviews] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [vehicleBookings, setVehicleBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [filters, setFilters] = useState({
    interview: true,
    meeting: true,
    vehicle: true
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async () => {
    try {
      const [interviewsRes, meetingsRes, vehiclesRes] = await Promise.all([
        api.get("/interviews"),
        api.get("/room-meetings"),
        api.get("/vehicle-bookings")
      ]);
      setInterviews(interviewsRes.data);
      setMeetings(meetingsRes.data);
      setVehicleBookings(vehiclesRes.data);
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

  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  // Normalize all events to a common format
  const getAllEvents = () => {
    const events = [];

    if (filters.interview) {
      interviews.forEach(i => {
        events.push({
          id: `interview-${i.id}`,
          type: "interview",
          title: `${i.first_name} ${i.last_name}`,
          subtitle: i.location || "Luogo non specificato",
          date: new Date(i.scheduled_at),
          status: i.status,
          color: EVENT_TYPES.interview.color,
          raw: i
        });
      });
    }

    if (filters.meeting) {
      meetings.forEach(m => {
        events.push({
          id: `meeting-${m.id}`,
          type: "meeting",
          title: m.title,
          subtitle: m.room_name,
          date: new Date(m.start_time),
          endDate: new Date(m.end_time),
          color: m.room_color || EVENT_TYPES.meeting.color,
          raw: m
        });
      });
    }

    if (filters.vehicle) {
      vehicleBookings.forEach(v => {
        events.push({
          id: `vehicle-${v.id}`,
          type: "vehicle",
          title: v.driver_name,
          subtitle: `${v.plate} - ${v.destination || "Destinazione n.s."}`,
          date: new Date(v.start_time),
          endDate: v.end_time ? new Date(v.end_time) : null,
          status: v.returned ? "returned" : "active",
          color: v.vehicle_color || EVENT_TYPES.vehicle.color,
          raw: v
        });
      });
    }

    return events;
  };

  const allEvents = getAllEvents();

  // Group events by date
  const eventsByDate = {};
  allEvents.forEach(event => {
    const date = event.date;
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
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

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const getEventIcon = (type) => {
    switch (type) {
      case "interview":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        );
      case "meeting":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        );
      case "vehicle":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
            <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
            <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const renderDays = () => {
    const days = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${month}-${day}`;
      const dayEvents = eventsByDate[dateKey] || [];
      const hasEvents = dayEvents.length > 0;
      const isSelected = selectedDay === day;

      // Count by type for indicators
      const typeCounts = {
        interview: dayEvents.filter(e => e.type === "interview").length,
        meeting: dayEvents.filter(e => e.type === "meeting").length,
        vehicle: dayEvents.filter(e => e.type === "vehicle").length
      };

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasEvents ? "has-interviews" : ""} ${isToday(day) ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDay(isSelected ? null : day)}
        >
          <span className="day-number">{day}</span>
          {hasEvents && (
            <div className="global-day-indicators">
              {typeCounts.interview > 0 && (
                <span className="type-dot" style={{ backgroundColor: EVENT_TYPES.interview.color }} title={`${typeCounts.interview} colloqui`}></span>
              )}
              {typeCounts.meeting > 0 && (
                <span className="type-dot" style={{ backgroundColor: EVENT_TYPES.meeting.color }} title={`${typeCounts.meeting} riunioni`}></span>
              )}
              {typeCounts.vehicle > 0 && (
                <span className="type-dot" style={{ backgroundColor: EVENT_TYPES.vehicle.color }} title={`${typeCounts.vehicle} veicoli`}></span>
              )}
              {dayEvents.length > 3 && (
                <span className="events-count">+{dayEvents.length}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateKey = selectedDay ? `${year}-${month}-${selectedDay}` : null;
  const selectedEvents = selectedDateKey
    ? (eventsByDate[selectedDateKey] || []).sort((a, b) => a.date - b.date)
    : [];

  // Count totals for the month
  const monthEvents = allEvents.filter(e => {
    return e.date.getMonth() === month && e.date.getFullYear() === year;
  });
  const monthCounts = {
    interview: monthEvents.filter(e => e.type === "interview").length,
    meeting: monthEvents.filter(e => e.type === "meeting").length,
    vehicle: monthEvents.filter(e => e.type === "vehicle").length,
    total: monthEvents.length
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento calendario globale...</div>
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
              <circle cx="8" cy="14" r="1"/>
              <circle cx="12" cy="14" r="1"/>
              <circle cx="16" cy="14" r="1"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Calendario Globale</h1>
            <p className="page-subtitle-modern">Panoramica di tutti gli impegni aziendali</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="global-stats-bar">
        <div className="global-stat">
          <span className="global-stat-value">{monthCounts.total}</span>
          <span className="global-stat-label">Totale impegni</span>
        </div>
        <div className="global-stat" style={{ "--stat-color": EVENT_TYPES.interview.color }}>
          <span className="global-stat-value">{monthCounts.interview}</span>
          <span className="global-stat-label">Colloqui</span>
        </div>
        <div className="global-stat" style={{ "--stat-color": EVENT_TYPES.meeting.color }}>
          <span className="global-stat-value">{monthCounts.meeting}</span>
          <span className="global-stat-label">Riunioni</span>
        </div>
        <div className="global-stat" style={{ "--stat-color": EVENT_TYPES.vehicle.color }}>
          <span className="global-stat-value">{monthCounts.vehicle}</span>
          <span className="global-stat-label">Veicoli</span>
        </div>
      </div>

      {/* Filters */}
      <div className="global-filter-bar">
        <label className="room-filter-label">Mostra:</label>
        <div className="room-filter-options">
          {Object.entries(EVENT_TYPES).map(([key, value]) => (
            <button
              key={key}
              className={`room-filter-btn ${filters[key] ? "active" : ""}`}
              onClick={() => toggleFilter(key)}
              style={{ "--room-color": value.color }}
            >
              <span className="room-filter-dot" style={{ backgroundColor: value.color }}></span>
              {value.label}
            </button>
          ))}
        </div>
      </div>

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
          {DAYS.map(day => (
            <div key={day} className="calendar-day-name">{day}</div>
          ))}
          {renderDays()}
        </div>

        {/* Selected Day Detail */}
        {selectedDay && (
          <div className="calendar-detail global-detail">
            <div className="calendar-detail-header">
              <h3>
                {selectedDay} {MONTHS[month]} {year}
              </h3>
              <span className="detail-count">
                {selectedEvents.length} impegn{selectedEvents.length !== 1 ? "i" : "o"}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="no-interviews">Nessun impegno per questo giorno.</p>
            ) : (
              <div className="calendar-detail-list global-events-list">
                {selectedEvents.map(event => (
                  <div key={event.id} className="global-event-item">
                    <div className="global-event-icon" style={{ backgroundColor: event.color }}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="global-event-time">
                      {formatTime(event.date)}
                      {event.endDate && (
                        <>
                          <span className="time-separator">-</span>
                          {formatTime(event.endDate)}
                        </>
                      )}
                    </div>
                    <div className="global-event-info">
                      <div className="global-event-header">
                        <span className="global-event-title">{event.title}</span>
                        <span className="global-event-type-badge" style={{ backgroundColor: event.color }}>
                          {EVENT_TYPES[event.type].label}
                        </span>
                        {event.status && (
                          <span className={`global-event-status ${event.status.toLowerCase().replace(" ", "-")}`}>
                            {event.status === "returned" ? "Restituito" : event.status}
                          </span>
                        )}
                      </div>
                      <span className="global-event-subtitle">{event.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
