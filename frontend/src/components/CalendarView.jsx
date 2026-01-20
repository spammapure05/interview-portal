import { useState } from "react";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function CalendarView({ interviews, onEditInterview, onFeedbackInterview, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Get starting day (0 = Sunday, we want Monday = 0)
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  // Group interviews by date
  const interviewsByDate = {};
  interviews.forEach(interview => {
    const date = new Date(interview.scheduled_at);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!interviewsByDate[dateKey]) {
      interviewsByDate[dateKey] = [];
    }
    interviewsByDate[dateKey].push(interview);
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

  const getStatusClass = (status) => {
    switch (status) {
      case "Programmato": return "cal-status-scheduled";
      case "Completato": return "cal-status-completed";
      case "Annullato": return "cal-status-cancelled";
      default: return "";
    }
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
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
      const dayInterviews = interviewsByDate[dateKey] || [];
      const hasInterviews = dayInterviews.length > 0;
      const isSelected = selectedDay === day;

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasInterviews ? "has-interviews" : ""} ${isToday(day) ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDay(isSelected ? null : day)}
        >
          <span className="day-number">{day}</span>
          {hasInterviews && (
            <div className="day-interviews">
              {dayInterviews.slice(0, 3).map((interview, idx) => (
                <div key={idx} className={`day-interview-dot ${getStatusClass(interview.status)}`}>
                  <span className="dot-time">
                    {new Date(interview.scheduled_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {dayInterviews.length > 3 && (
                <span className="more-interviews">+{dayInterviews.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateKey = selectedDay ? `${year}-${month}-${selectedDay}` : null;
  const selectedInterviews = selectedDateKey ? (interviewsByDate[selectedDateKey] || []) : [];

  return (
    <div className="calendar-view">
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
            <span className="detail-count">
              {selectedInterviews.length} colloqui{selectedInterviews.length !== 1 ? "" : "o"}
            </span>
          </div>

          {selectedInterviews.length === 0 ? (
            <p className="no-interviews">Nessun colloquio programmato per questo giorno.</p>
          ) : (
            <div className="calendar-detail-list">
              {selectedInterviews
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map(interview => (
                  <div key={interview.id} className="calendar-detail-item">
                    <div className="detail-item-time">
                      {new Date(interview.scheduled_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="detail-item-info">
                      <div className="detail-item-header">
                        <span className="detail-item-name">
                          {interview.first_name} {interview.last_name}
                        </span>
                        <span className={`detail-item-status ${getStatusClass(interview.status)}`}>
                          {interview.status}
                        </span>
                      </div>
                      {interview.location && (
                        <span className="detail-item-location">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {interview.location}
                        </span>
                      )}
                      {interview.feedback && (
                        <div className="detail-item-feedback">
                          <strong>Feedback:</strong> {interview.feedback}
                        </div>
                      )}
                    </div>
                    {user && (user.role === "admin" || user.role === "secretary") && (
                      <div className="detail-item-actions">
                        <button
                          className="btn-icon-small"
                          title="Modifica"
                          onClick={() => onEditInterview(interview)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {user.role === "admin" && (
                          <button
                            className="btn-icon-small btn-feedback-icon"
                            title="Valutazione"
                            onClick={() => onFeedbackInterview(interview)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
