import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function SearchableSelect({ options = [], value, onChange, placeholder = "Seleziona...", disabled = false, onOpen }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const dropdownSearchRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listboxIdRef = useRef(`ss-listbox-${Math.random().toString(36).slice(2,9)}`);

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
      // focus the search input inside dropdown if present
      setTimeout(() => {
        if (dropdownSearchRef.current) dropdownSearchRef.current.focus();
      }, 50);
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

  // reset highlight when filtered changes
  useEffect(() => setHighlightIndex(filtered.length ? 0 : -1), [open, q, options.length]);

  const selected = options.find(o => String(o.value) === String(value));

  const dropdown = (
    <div className="ss-dropdown" ref={dropdownRef} style={dropdownStyle} role="listbox" id={listboxIdRef.current} aria-label="Candidati">
      <div style={{ padding: '0.5rem' }}>
        <input
          ref={dropdownSearchRef}
          className="ss-filter-input"
          placeholder="Cerca candidato..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            const max = filtered.length - 1;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIndex(i => Math.min(max, Math.max(0, i + 1)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex(i => Math.max(0, i - 1));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setHighlightIndex(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setHighlightIndex(max);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const pick = filtered[highlightIndex] || filtered[0];
              if (pick) {
                onChange && onChange(pick.value);
                setOpen(false);
                setQuery("");
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="ss-empty">Nessun risultato</div>
      ) : (
        filtered.map((o, idx) => (
          <button
            key={o.value}
            type="button"
            id={`${listboxIdRef.current}-opt-${idx}`}
            className={`ss-option ${String(o.value) === String(value) ? "selected" : ""} ${idx === highlightIndex ? 'highlight' : ''}`}
            aria-selected={idx === highlightIndex}
            onMouseEnter={() => setHighlightIndex(idx)}
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
      <div className={`ss-control ${disabled ? "disabled" : ""}`} onClick={() => {
        if (disabled) return;
        const next = s => !s;
        setOpen(s => {
          const newState = next(s);
          if (newState && typeof onOpen === 'function') onOpen();
          return newState;
        });
      }}>
        <input
          type="text"
          className="ss-input"
          placeholder={selected ? selected.label : placeholder}
          value={selected ? selected.label : ""}
          readOnly
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              if (typeof onOpen === 'function') onOpen();
            }
          }}
          disabled={disabled}
          aria-expanded={open}
        />
        <button type="button" className="ss-arrow" onClick={() => {
          if (disabled) return;
          setOpen(s => {
            const newState = !s;
            if (newState && typeof onOpen === 'function') onOpen();
            return newState;
          });
        }} aria-label="toggle">
          ▾
        </button>
      </div>

      {open ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
