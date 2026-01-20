import { useEffect, useState } from "react";
import api from "../api";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

const FUEL_TYPES = [
  { value: "benzina", label: "Benzina" },
  { value: "diesel", label: "Diesel" },
  { value: "gpl", label: "GPL" },
  { value: "metano", label: "Metano" },
  { value: "ibrido", label: "Ibrido" },
  { value: "elettrico", label: "Elettrico" },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [currentKm, setCurrentKm] = useState("");
  const [notes, setNotes] = useState("");
  const [parkingLocation, setParkingLocation] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [active, setActive] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data);
    } catch (err) {
      console.error("Errore caricamento veicoli", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setPlate("");
    setBrand("");
    setModel("");
    setFuelType("");
    setCurrentKm("");
    setNotes("");
    setParkingLocation("");
    setColor(PRESET_COLORS[0]);
    setActive(true);
    setError("");
    setEditVehicle(null);
    setShowForm(false);
  };

  const openEditForm = (vehicle) => {
    setEditVehicle(vehicle);
    setPlate(vehicle.plate);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setFuelType(vehicle.fuel_type || "");
    setCurrentKm(vehicle.current_km || "");
    setNotes(vehicle.notes || "");
    setParkingLocation(vehicle.parking_location || "");
    setColor(vehicle.color || PRESET_COLORS[0]);
    setActive(vehicle.active === 1);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    const payload = {
      plate,
      brand,
      model,
      fuel_type: fuelType || null,
      current_km: currentKm ? parseInt(currentKm) : 0,
      notes: notes || null,
      parking_location: parkingLocation || null,
      color,
      active: active ? 1 : 0
    };

    try {
      if (editVehicle) {
        await api.put(`/vehicles/${editVehicle.id}`, payload);
      } else {
        await api.post("/vehicles", payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Errore nel salvataggio");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/vehicles/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  const formatKm = (km) => {
    if (!km) return "0 km";
    return km.toLocaleString("it-IT") + " km";
  };

  const getFuelLabel = (value) => {
    const fuel = FUEL_TYPES.find(f => f.value === value);
    return fuel ? fuel.label : value || "Non specificato";
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
              <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
              <path d="M9 17v-4"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Gestione Veicoli Aziendali</h1>
            <p className="page-subtitle-modern">Configura i veicoli disponibili per le prenotazioni</p>
          </div>
        </div>
        <button className="btn-primary-modern" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuovo Veicolo
        </button>
      </div>

      <div className="vehicles-page-content">
        {loading ? (
          <div className="loading-state">Caricamento veicoli...</div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                <path d="M5 17H3v-4m0 0L5 7h10l2 4m-14 2h14m0 0v4h-2m2-4h3l-2-4h-1"/>
              </svg>
            </div>
            <h3>Nessun veicolo configurato</h3>
            <p>Inizia aggiungendo il primo veicolo aziendale.</p>
          </div>
        ) : (
          <div className="vehicles-grid">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className={`vehicle-card ${vehicle.active ? "" : "vehicle-inactive"}`}>
                <div className="vehicle-color-bar" style={{ backgroundColor: vehicle.color || PRESET_COLORS[0] }}></div>
                <div className="vehicle-card-content">
                  <div className="vehicle-header">
                    <div className="vehicle-plate">{vehicle.plate}</div>
                    {!vehicle.active && <span className="vehicle-inactive-badge">Inattivo</span>}
                  </div>
                  <h3 className="vehicle-name">{vehicle.brand} {vehicle.model}</h3>

                  <div className="vehicle-details">
                    <div className="vehicle-detail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M2 12h20"/>
                      </svg>
                      <span>{getFuelLabel(vehicle.fuel_type)}</span>
                    </div>
                    <div className="vehicle-detail">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span>{formatKm(vehicle.current_km)}</span>
                    </div>
                    {vehicle.parking_location && (
                      <div className="vehicle-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{vehicle.parking_location}</span>
                      </div>
                    )}
                  </div>

                  {vehicle.notes && (
                    <p className="vehicle-notes">{vehicle.notes}</p>
                  )}

                  <div className="vehicle-actions">
                    <button className="btn-icon" title="Modifica" onClick={() => openEditForm(vehicle)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="btn-icon btn-danger-icon" title="Elimina" onClick={() => setDeleteConfirm(vehicle)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editVehicle ? "Modifica Veicolo" : "Nuovo Veicolo"}</h2>
              <button className="modal-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modern-form">
              {error && <div className="form-error">{error}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18"/>
                    </svg>
                    Targa *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    required
                    disabled={formLoading}
                    placeholder="Es. AB123CD"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                    Alimentazione
                  </label>
                  <select
                    className="form-input"
                    value={fuelType}
                    onChange={e => setFuelType(e.target.value)}
                    disabled={formLoading}
                  >
                    <option value="">Seleziona...</option>
                    {FUEL_TYPES.map(fuel => (
                      <option key={fuel.value} value={fuel.value}>{fuel.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z"/>
                    </svg>
                    Marca *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    required
                    disabled={formLoading}
                    placeholder="Es. Fiat"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>
                    </svg>
                    Modello *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    required
                    disabled={formLoading}
                    placeholder="Es. Panda"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Chilometri attuali
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentKm}
                    onChange={e => setCurrentKm(e.target.value)}
                    disabled={formLoading}
                    min="0"
                    placeholder="Es. 50000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Posizione Parcheggio
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={parkingLocation}
                    onChange={e => setParkingLocation(e.target.value)}
                    disabled={formLoading}
                    placeholder="Es. Piano -1, Posto A12"
                  />
                </div>
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
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={formLoading}
                  rows="3"
                  placeholder="Informazioni aggiuntive sul veicolo..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="13.5" cy="6.5" r="2.5"/>
                    <circle cx="19" cy="17" r="2"/>
                    <circle cx="6" cy="12" r="2"/>
                  </svg>
                  Colore identificativo
                </label>
                <div className="color-picker">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-option ${color === c ? "selected" : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      disabled={formLoading}
                    />
                  ))}
                </div>
              </div>

              {editVehicle && (
                <div className="form-group">
                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => setActive(e.target.checked)}
                      disabled={formLoading}
                    />
                    <span>Veicolo attivo</span>
                  </label>
                </div>
              )}

              <div className="form-actions-row">
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Salvataggio..." : (editVehicle ? "Aggiorna" : "Crea Veicolo")}
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
              <p>Sei sicuro di voler eliminare il veicolo <strong>{deleteConfirm.plate}</strong> ({deleteConfirm.brand} {deleteConfirm.model})?</p>
              <p className="text-muted">Questa azione eliminerà anche tutte le prenotazioni passate associate.</p>
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
