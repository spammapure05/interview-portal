import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function SearchableSelect({ options = [], value, onChange, placeholder = "Seleziona...", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    function handleClick(e) {
      // If click inside control, keep open
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) return;
      // If click inside dropdown (portal), keep open
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    function updatePos() {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({ position: "fixed", top: r.bottom + 8, left: r.left, width: r.width, zIndex: 3000 });
    }
    if (open) {
      updatePos();
      window.addEventListener("resize", updatePos);
      window.addEventListener("scroll", updatePos, true);
    }
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = options.filter(o => {
    if (!q) return true;
    return String(o.label || "").toLowerCase().includes(q);
  });

  const selected = options.find(o => String(o.value) === String(value));

  const dropdown = (
    <div className="ss-dropdown" ref={dropdownRef} style={dropdownStyle}>
      {filtered.length === 0 ? (
        <div className="ss-empty">Nessun risultato</div>
      ) : (
        filtered.map(o => (
          <button
            key={o.value}
            type="button"
            className={`ss-option ${String(o.value) === String(value) ? "selected" : ""}`}
            onClick={() => { onChange && onChange(o.value); setOpen(false); setQuery(""); }}
          >
            {o.label}
          </button>
        ))
      )}
    </div>
  );

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
          aria-expanded={open}
        />
        <button type="button" className="ss-arrow" onClick={() => !disabled && setOpen(s => !s)} aria-label="toggle">
          ▾
        </button>
      </div>

      {open ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
