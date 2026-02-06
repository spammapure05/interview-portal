import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../authContext";

export default function PipelinePage() {
  const { user } = useAuth();
  const [kanban, setKanban] = useState([]);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ first_name: "", last_name: "", email: "", phone: "", position_applied: "" });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadKanban();
    loadPositions();
    if (user?.role === "admin") {
      loadStats();
    }
  }, [selectedPosition]);

  const loadKanban = async () => {
    try {
      const url = selectedPosition
        ? `/pipeline/kanban?position=${encodeURIComponent(selectedPosition)}`
        : "/pipeline/kanban";
      const res = await api.get(url);
      setKanban(res.data);
    } catch (err) {
      console.error("Errore caricamento pipeline", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const res = await api.get("/pipeline/positions");
      setPositions(res.data);
    } catch (err) {
      console.error("Errore caricamento posizioni", err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/pipeline/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Errore caricamento stats", err);
    }
  };

  const handleDragStart = (e, candidate, fromStageId) => {
    setDraggedCandidate({ ...candidate, fromStageId });
    e.dataTransfer.effectAllowed = "move";
    e.target.classList.add("dragging");
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging");
    setDraggedCandidate(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDragLeave = (e) => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, toStageId) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedCandidate || draggedCandidate.fromStageId === toStageId) {
      return;
    }

    // Optimistic update
    const updatedKanban = kanban.map((stage) => {
      if (stage.id === draggedCandidate.fromStageId || (draggedCandidate.fromStageId === null && stage.order_index === 0)) {
        return {
          ...stage,
          candidates: stage.candidates.filter((c) => c.id !== draggedCandidate.id),
        };
      }
      if (stage.id === toStageId) {
        return {
          ...stage,
          candidates: [...stage.candidates, { ...draggedCandidate, pipeline_stage_id: toStageId }],
        };
      }
      return stage;
    });
    setKanban(updatedKanban);

    try {
      await api.patch(`/pipeline/candidates/${draggedCandidate.id}/stage`, {
        stage_id: toStageId,
      });
      // Reload stats after move
      if (user?.role === "admin") {
        loadStats();
      }
    } catch (err) {
      console.error("Errore spostamento candidato", err);
      // Revert on error
      loadKanban();
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidate.first_name || !newCandidate.last_name) return;

    setSaving(true);
    try {
      const res = await api.post("/candidates", newCandidate);
      setShowAddModal(false);
      setNewCandidate({ first_name: "", last_name: "", email: "", phone: "", position_applied: "" });
      loadKanban();
      if (newCandidate.position_applied && !positions.includes(newCandidate.position_applied)) {
        loadPositions();
      }
    } catch (err) {
      console.error("Errore creazione candidato", err);
      alert("Errore nella creazione del candidato");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return "Domani";
    if (diffDays < 7) return `Tra ${diffDays} giorni`;
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const getScoreColor = (score) => {
    if (!score) return "var(--text-muted)";
    if (score >= 4) return "#10b981";
    if (score >= 3) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento pipeline...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper pipeline-page">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Pipeline Candidati</h1>
            <p className="page-subtitle-modern">Gestisci il flusso di selezione dei candidati</p>
          </div>
        </div>
        <div className="page-header-actions">
          <select
            className="select-modern"
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
          >
            <option value="">Tutte le posizioni</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuovo Candidato
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && user?.role === "admin" && (
        <div className="pipeline-stats-bar">
          <div className="pipeline-stat-item">
            <span className="pipeline-stat-value">{stats.funnel?.reduce((sum, s) => sum + s.count, 0) || 0}</span>
            <span className="pipeline-stat-label">Totale Candidati</span>
          </div>
          <div className="pipeline-stat-divider" />
          {stats.funnel?.slice(0, 5).map((stage, idx) => (
            <div key={idx} className="pipeline-stat-item">
              <span className="pipeline-stat-value" style={{ color: kanban[idx]?.color }}>{stage.count}</span>
              <span className="pipeline-stat-label">{stage.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {kanban.map((stage) => (
          <div
            key={stage.id}
            className={`kanban-column ${dragOverStage === stage.id ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="kanban-column-header" style={{ borderTopColor: stage.color }}>
              <div className="kanban-column-title">
                <span className="kanban-column-dot" style={{ backgroundColor: stage.color }} />
                <h3>{stage.name}</h3>
                <span className="kanban-column-count">{stage.candidates.length}</span>
              </div>
            </div>
            <div className="kanban-column-body">
              {stage.candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate, stage.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="kanban-card-header">
                    <Link to={`/candidates/${candidate.id}`} className="kanban-card-name">
                      {candidate.first_name} {candidate.last_name}
                    </Link>
                    {candidate.avg_score && (
                      <span
                        className="kanban-card-score"
                        style={{ color: getScoreColor(candidate.avg_score) }}
                      >
                        {candidate.avg_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {candidate.position_applied && (
                    <div className="kanban-card-position">{candidate.position_applied}</div>
                  )}
                  <div className="kanban-card-meta">
                    {candidate.interview_count > 0 && (
                      <span className="kanban-card-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                        </svg>
                        {candidate.interview_count}
                      </span>
                    )}
                    {formatDate(candidate.next_interview) && (
                      <span className="kanban-card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {formatDate(candidate.next_interview)}
                      </span>
                    )}
                  </div>
                  {candidate.email && (
                    <div className="kanban-card-email">{candidate.email}</div>
                  )}
                </div>
              ))}
              {stage.candidates.length === 0 && (
                <div className="kanban-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="17" y1="8" x2="23" y2="8" />
                  </svg>
                  <span>Nessun candidato</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuovo Candidato</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddCandidate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={newCandidate.first_name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cognome *</label>
                    <input
                      type="text"
                      value={newCandidate.last_name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Telefono</label>
                    <input
                      type="tel"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Posizione</label>
                  <input
                    type="text"
                    value={newCandidate.position_applied}
                    onChange={(e) => setNewCandidate({ ...newCandidate, position_applied: e.target.value })}
                    placeholder="es. Operativo Export"
                    list="positions-list"
                  />
                  <datalist id="positions-list">
                    {positions.map((pos) => (
                      <option key={pos} value={pos} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Salvataggio..." : "Crea Candidato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
