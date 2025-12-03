import { useState, useRef, useEffect } from "react";

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Seleziona...",
  disabled = false,
  onOpen
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter candidates
  const q = query.trim().toLowerCase();
  const filtered = options.filter(o => {
    if (!q) return true;
    return String(o.label || "").toLowerCase().includes(q);
  });

  // Get selected candidate label
  const selected = options.find(o => String(o.value) === String(value));

  // Handle selection
  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setOpen(false);
    setQuery("");
  };

  // Handle toggle
  const handleToggle = () => {
    if (disabled) return;
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && typeof onOpen === "function") {
      onOpen();
    }
  };

  return (
    <div className="searchable-select" ref={wrapperRef}>
      {/* Main control */}
      <div
        className={`ss-control ${disabled ? "ss-disabled" : ""} ${open ? "ss-open" : ""}`}
        onClick={handleToggle}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <input
          type="text"
          className="ss-input"
          placeholder={placeholder}
          value={selected ? selected.label : ""}
          readOnly
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
        />
        <span className="ss-arrow">▼</span>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="ss-dropdown" role="listbox">
          {/* Search input in dropdown */}
          <input
            ref={searchInputRef}
            type="text"
            className="ss-search"
            placeholder="Cerca candidato..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            autoComplete="off"
          />

          {/* Options list */}
          <div className="ss-options-container">
            {filtered.length === 0 ? (
              <div className="ss-empty">Nessun risultato</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`ss-option ${
                    String(option.value) === String(value) ? "ss-selected" : ""
                  }`}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
