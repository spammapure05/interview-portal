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

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [active, setActive] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (err) {
      console.error("Errore caricamento sale", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setCapacity("");
    setDescription("");
    setColor(PRESET_COLORS[0]);
    setActive(true);
    setError("");
    setEditRoom(null);
    setShowForm(false);
  };

  const openEditForm = (room) => {
    setEditRoom(room);
    setName(room.name);
    setCapacity(room.capacity || "");
    setDescription(room.description || "");
    setColor(room.color || PRESET_COLORS[0]);
    setActive(room.active === 1);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    const payload = {
      name,
      capacity: capacity ? parseInt(capacity) : null,
      description: description || null,
      color,
      active: active ? 1 : 0
    };

    try {
      if (editRoom) {
        await api.put(`/rooms/${editRoom.id}`, payload);
      } else {
        await api.post("/rooms", payload);
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
      await api.delete(`/rooms/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Gestione Sale Meeting</h1>
            <p className="page-subtitle-modern">Configura le sale disponibili per le riunioni</p>
          </div>
        </div>
        <button className="btn-primary-modern" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuova Sala
        </button>
      </div>

      <div className="rooms-page-content">
        {loading ? (
          <div className="loading-state">Caricamento sale...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3>Nessuna sala configurata</h3>
            <p>Inizia aggiungendo la prima sala meeting.</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map(room => (
              <div key={room.id} className={`room-card ${room.active ? "" : "room-inactive"}`}>
                <div className="room-color-bar" style={{ backgroundColor: room.color || PRESET_COLORS[0] }}></div>
                <div className="room-card-content">
                  <div className="room-header">
                    <h3 className="room-name">{room.name}</h3>
                    {!room.active && <span className="room-inactive-badge">Inattiva</span>}
                  </div>
                  {room.capacity && (
                    <div className="room-capacity">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span>Capacità: {room.capacity} persone</span>
                    </div>
                  )}
                  {room.description && (
                    <p className="room-description">{room.description}</p>
                  )}
                  <div className="room-actions">
                    <button className="btn-icon" title="Modifica" onClick={() => openEditForm(room)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="btn-icon btn-danger-icon" title="Elimina" onClick={() => setDeleteConfirm(room)}>
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

      {/* Room Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editRoom ? "Modifica Sala" : "Nuova Sala"}</h2>
              <button className="modal-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modern-form">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  Nome Sala *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder="Es. Sala Riunioni A"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  Capacità (persone)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  disabled={formLoading}
                  min="1"
                  placeholder="Es. 10"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="17" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Descrizione
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={formLoading}
                  rows="3"
                  placeholder="Note sulla sala, attrezzature disponibili..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="13.5" cy="6.5" r="2.5"/>
                    <circle cx="19" cy="17" r="2"/>
                    <circle cx="6" cy="12" r="2"/>
                    <path d="M16 6.5h-3a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-3"/>
                  </svg>
                  Colore
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

              {editRoom && (
                <div className="form-group">
                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => setActive(e.target.checked)}
                      disabled={formLoading}
                    />
                    <span>Sala attiva</span>
                  </label>
                </div>
              )}

              <div className="form-actions-row">
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Salvataggio..." : (editRoom ? "Aggiorna" : "Crea Sala")}
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
              <p>Sei sicuro di voler eliminare la sala <strong>{deleteConfirm.name}</strong>?</p>
              <p className="text-muted">Questa azione eliminerà anche tutte le riunioni passate associate.</p>
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
