import { useState, useEffect } from "react";

export default function DateTimePicker({ value, onChange, disabled = false }) {
  const [date, setDate] = useState(value ? new Date(value) : new Date());
  const [showCalendar, setShowCalendar] = useState(false);
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
    newDate.setHours(parseInt(selectedHour), parseInt(selectedMinute));
    setDate(newDate);
    updateParent(newDate);
  };

  const handleTimeChange = (hour, minute) => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour || 0), parseInt(minute || 0));
    setDate(newDate);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    updateParent(newDate);
  };

  const updateParent = (newDate) => {
    const iso = newDate.toISOString().slice(0, 16);
    onChange(iso);
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

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-empty"></div>);
    }

    // Days
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
          className={`cal-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
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

  return (
    <div className="datetime-picker">
      <div className="datetime-input-wrapper">
        <input
          type="text"
          className="datetime-display"
          value={`${date.toLocaleDateString("it-IT")} ${selectedHour}:${selectedMinute}`}
          onClick={() => setShowCalendar(!showCalendar)}
          readOnly
          disabled={disabled}
          placeholder="Seleziona data e ora"
        />
        <span className="datetime-icon" onClick={() => setShowCalendar(!showCalendar)}>
          📅
        </span>
      </div>

      {showCalendar && (
        <div className="datetime-picker-dropdown">
          {/* Calendar Section */}
          <div className="cal-section">
            <div className="cal-header">
              <button
                type="button"
                className="cal-nav"
                onClick={handlePrevMonth}
                disabled={disabled}
              >
                ◀
              </button>
              <div className="cal-month-year">{monthYear}</div>
              <button
                type="button"
                className="cal-nav"
                onClick={handleNextMonth}
                disabled={disabled}
              >
                ▶
              </button>
            </div>

            <div className="cal-weekdays">
              <div>Do</div>
              <div>Lu</div>
              <div>Ma</div>
              <div>Me</div>
              <div>Gi</div>
              <div>Ve</div>
              <div>Sa</div>
            </div>

            <div className="cal-grid">{renderCalendar()}</div>
          </div>

          {/* Time Section */}
          <div className="time-section">
            <div className="time-header">Ora</div>
            <div className="time-inputs">
              <div className="time-field">
                <label>Ore</label>
                <div className="time-spinner">
                  <button
                    type="button"
                    onClick={() => {
                      const h = (parseInt(selectedHour) + 1) % 24;
                      handleTimeChange(h.toString().padStart(2, "0"), selectedMinute);
                    }}
                    disabled={disabled}
                    className="spinner-btn"
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={selectedHour}
                    onChange={(e) => {
                      const val = e.target.value.padStart(2, "0");
                      if (val <= "23") handleTimeChange(val, selectedMinute);
                    }}
                    disabled={disabled}
                    className="time-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const h = (parseInt(selectedHour) - 1 + 24) % 24;
                      handleTimeChange(h.toString().padStart(2, "0"), selectedMinute);
                    }}
                    disabled={disabled}
                    className="spinner-btn"
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="time-separator">:</div>

              <div className="time-field">
                <label>Minuti</label>
                <div className="time-spinner">
                  <button
                    type="button"
                    onClick={() => {
                      const m = (parseInt(selectedMinute) + 15) % 60;
                      handleTimeChange(selectedHour, m.toString().padStart(2, "0"));
                    }}
                    disabled={disabled}
                    className="spinner-btn"
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={selectedMinute}
                    onChange={(e) => {
                      const val = e.target.value.padStart(2, "0");
                      if (val <= "59") handleTimeChange(selectedHour, val);
                    }}
                    disabled={disabled}
                    className="time-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const m = (parseInt(selectedMinute) - 15 + 60) % 60;
                      handleTimeChange(selectedHour, m.toString().padStart(2, "0"));
                    }}
                    disabled={disabled}
                    className="spinner-btn"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="datetime-footer">
            <button
              type="button"
              className="btn-close-picker"
              onClick={() => setShowCalendar(false)}
            >
              ✓ Conferma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
