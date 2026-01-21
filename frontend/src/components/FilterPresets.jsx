import { useState } from "react";

/**
 * Componente per gestire i preset dei filtri salvati
 */
export default function FilterPresets({
  savedPresets = [],
  activePreset,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onReset,
  hasActiveFilters
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!presetName.trim()) return;
    setIsSaving(true);
    const success = await onSavePreset(presetName);
    setIsSaving(false);
    if (success) {
      setPresetName("");
      setIsModalOpen(false);
    }
  };

  return (
    <div className="filter-presets">
      <div className="filter-presets-header">
        {savedPresets.length > 0 && (
          <div className="preset-chips">
            {savedPresets.map(preset => (
              <div
                key={preset.id}
                className={`preset-chip ${activePreset === preset.id ? "active" : ""}`}
              >
                <button
                  className="preset-chip-btn"
                  onClick={() => onApplyPreset(preset.id)}
                  title={`Applica: ${preset.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  {preset.name}
                </button>
                <button
                  className="preset-delete-btn"
                  onClick={() => onDeletePreset(preset.id)}
                  title="Elimina preset"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="preset-actions">
          {hasActiveFilters && (
            <>
              <button
                className="btn-preset-action"
                onClick={() => setIsModalOpen(true)}
                title="Salva filtri attuali come preset"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Salva filtro
              </button>
              <button
                className="btn-preset-action reset"
                onClick={onReset}
                title="Rimuovi tutti i filtri"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <path d="M19 6l-1 14c0 1-1 2-2 2H8c-1 0-2-1-2-2L5 6"/>
                </svg>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal per salvare preset */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h3>Salva Filtro</h3>
            <p className="modal-description">
              Dai un nome a questa combinazione di filtri per riutilizzarla in futuro.
            </p>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Nome del filtro..."
              className="preset-name-input"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Annulla
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!presetName.trim() || isSaving}
              >
                {isSaving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
