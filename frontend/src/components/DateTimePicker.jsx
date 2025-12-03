import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function DateTimePicker({ value, onChange, disabled = false }) {
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(value ? new Date(value) : new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date(date));
  const [selectedHour, setSelectedHour] = useState(date.getHours().toString().padStart(2, "0"));
  const [selectedMinute, setSelectedMinute] = useState(date.getMinutes().toString().padStart(2, "0"));

  useEffect(() => {
    if (value) {
      const newDate = new Date(value);
      setDate(newDate);
      setCurrentMonth(newDate);
      setSelectedHour(newDate.getHours().toString().padStart(2, "0"));
      setSelectedMinute(newDate.getMinutes().toString().padStart(2, "0"));
    }
  }, [value]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    newDate.setHours(parseInt(selectedHour, 10), parseInt(selectedMinute, 10));
    setDate(newDate);
  };

  const handleConfirm = () => {
    const iso = date.toISOString().slice(0, 16);
    onChange(iso);
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="dtp-cal-empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === date.getDate() &&
        currentMonth.getMonth() === date.getMonth() &&
        currentMonth.getFullYear() === date.getFullYear();
      const isToday =
        day === new Date().getDate() &&
        currentMonth.getMonth() === new Date().getMonth() &&
        currentMonth.getFullYear() === new Date().getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          className={`dtp-cal-day ${isSelected ? "dtp-selected" : ""} ${isToday ? "dtp-today" : ""}`}
          onClick={() => handleDateSelect(day)}
          disabled={disabled}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthYear = currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const displayDate = `${date.toLocaleDateString("it-IT")} ${selectedHour}:${selectedMinute}`;

  const modal = (
    <div className="dtp-overlay">
      <div className="dtp-modal">
        <div className="dtp-header">
          <h3>Seleziona Data e Ora</h3>
          <button type="button" className="dtp-close-btn" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="dtp-content">
          {/* Calendar */}
          <div className="dtp-cal-section">
            <div className="dtp-cal-nav">
              <button type="button" onClick={handlePrevMonth} disabled={disabled}>
                ◀
              </button>
              <span className="dtp-cal-month">{monthYear}</span>
              <button type="button" onClick={handleNextMonth} disabled={disabled}>
                ▶
              </button>
            </div>

            <div className="dtp-cal-weekdays">
              <div>Do</div>
              <div>Lu</div>
              <div>Ma</div>
              <div>Me</div>
              <div>Gi</div>
              <div>Ve</div>
              <div>Sa</div>
            </div>

            <div className="dtp-cal-grid">{renderCalendar()}</div>
          </div>

          {/* Time */}
          <div className="dtp-time-section">
            <label className="dtp-time-label">Ora</label>
            <div className="dtp-time-inputs">
              <div className="dtp-time-field">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={(e) => {
                    let val = e.target.value.padStart(2, "0");
                    if (parseInt(val, 10) > 23) val = "23";
                    setSelectedHour(val);
                  }}
                  disabled={disabled}
                  className="dtp-time-input"
                />
                <span className="dtp-time-label-sm">Ore</span>
              </div>

              <span className="dtp-time-sep">:</span>

              <div className="dtp-time-field">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={selectedMinute}
                  onChange={(e) => {
                    let val = e.target.value.padStart(2, "0");
                    if (parseInt(val, 10) > 59) val = "59";
                    setSelectedMinute(val);
                  }}
                  disabled={disabled}
                  className="dtp-time-input"
                />
                <span className="dtp-time-label-sm">Min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dtp-footer">
          <button type="button" className="dtp-btn-cancel" onClick={handleCancel}>
            Annulla
          </button>
          <button type="button" className="dtp-btn-confirm" onClick={handleConfirm} disabled={disabled}>
            ✓ Conferma
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="datetime-picker">
      <div className="dtp-display-wrapper">
        <input
          type="text"
          className="dtp-display"
          value={displayDate}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setShowModal(true)}
          placeholder="Seleziona data e ora"
        />
        <button
          type="button"
          className="dtp-trigger-btn"
          onClick={() => !disabled && setShowModal(true)}
          disabled={disabled}
          aria-label="Apri calendario"
        >
          📅
        </button>
      </div>

      {showModal ? createPortal(modal, document.body) : null}
    </div>
  );
}
