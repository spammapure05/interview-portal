import { useState, useRef, useEffect } from "react";

export default function SearchableSelect({ options = [], value, onChange, placeholder = "Seleziona...", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const filtered = options.filter(o => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q);
  });

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <div className={`ss-control ${disabled ? "disabled" : ""}`} onClick={() => !disabled && setOpen(s => !s)}>
        <input
          type="text"
          className="ss-input"
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : (selected ? selected.label : "")}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
        />
        <button type="button" className="ss-arrow" onClick={() => !disabled && setOpen(s => !s)} aria-label="toggle">
          ▾
        </button>
      </div>

      {open && (
        <div className="ss-dropdown">
          {filtered.length === 0 ? (
            <div className="ss-empty">Nessun risultato</div>
          ) : (
            filtered.map(o => (
              <button
                key={o.value}
                type="button"
                className={`ss-option ${String(o.value) === String(value) ? "selected" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
