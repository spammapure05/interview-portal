import { useState, useEffect } from "react";
import api from "../api";

export default function ScorecardModal({ interviewId, candidateName, onClose, onSaved }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [scores, setScores] = useState({});
  const [verdict, setVerdict] = useState({
    recommendation: "",
    final_notes: ""
  });
  const [existingData, setExistingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    loadData();
  }, [interviewId]);

  const loadData = async () => {
    try {
      const [templatesRes, scorecardRes] = await Promise.all([
        api.get("/scorecard/templates?active_only=true"),
        api.get(`/scorecard/interviews/${interviewId}`)
      ]);

      setTemplates(templatesRes.data);
      setExistingData(scorecardRes.data);

      // If interview has existing scores/verdict, load them
      if (scorecardRes.data.scores) {
        setScores(scorecardRes.data.scores);
      }
      if (scorecardRes.data.verdict) {
        setVerdict({
          recommendation: scorecardRes.data.verdict.recommendation || "",
          final_notes: scorecardRes.data.verdict.final_notes || ""
        });
      }

      // If interview has a template assigned, load it
      if (scorecardRes.data.interview?.template_id) {
        setSelectedTemplate(scorecardRes.data.interview.template_id);
        loadTemplate(scorecardRes.data.interview.template_id);
      }
    } catch (err) {
      console.error("Errore caricamento scorecard", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const res = await api.get(`/scorecard/templates/${templateId}`);
      setTemplateDetails(res.data);
    } catch (err) {
      console.error("Errore caricamento template", err);
    }
  };

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      loadTemplate(templateId);
      // Assign template to interview
      try {
        await api.patch(`/scorecard/interviews/${interviewId}/template`, {
          template_id: templateId
        });
      } catch (err) {
        console.error("Errore assegnazione template", err);
      }
    } else {
      setTemplateDetails(null);
    }
  };

  const handleScoreChange = (criteriaId, score) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        score
      }
    }));
  };

  const handleNoteChange = (criteriaId, notes) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        notes
      }
    }));
  };

  const calculateCategoryScore = (category) => {
    let total = 0;
    let count = 0;
    category.criteria.forEach(crit => {
      if (scores[crit.id]?.score) {
        total += scores[crit.id].score;
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(1) : "-";
  };

  const calculateTotalScore = () => {
    if (!templateDetails?.categories) return null;

    let weightedSum = 0;
    let totalWeight = 0;

    templateDetails.categories.forEach(cat => {
      const catScore = calculateCategoryScore(cat);
      if (catScore !== "-") {
        weightedSum += parseFloat(catScore) * (cat.weight || 1);
        totalWeight += (cat.weight || 1);
      }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : null;
  };

  const getCompletionPercentage = () => {
    if (!templateDetails?.categories) return 0;
    let total = 0;
    let completed = 0;
    templateDetails.categories.forEach(cat => {
      cat.criteria.forEach(crit => {
        total++;
        if (scores[crit.id]?.score) completed++;
      });
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save scores
      await api.post(`/scorecard/interviews/${interviewId}/scores`, { scores });

      // Save verdict if recommendation is selected
      if (verdict.recommendation) {
        await api.post(`/scorecard/interviews/${interviewId}/verdict`, {
          ...verdict,
          template_id: selectedTemplate
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Errore salvataggio", err);
      alert("Errore nel salvataggio della valutazione");
    } finally {
      setSaving(false);
    }
  };

  const recommendationOptions = [
    { value: "strongly_recommended", label: "Fortemente consigliato", color: "#10b981", icon: "★★" },
    { value: "recommended", label: "Consigliato", color: "#3b82f6", icon: "★" },
    { value: "with_reservations", label: "Con riserve", color: "#f59e0b", icon: "◐" },
    { value: "not_recommended", label: "Non consigliato", color: "#ef4444", icon: "✕" }
  ];

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="loading-state">Caricamento scorecard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-fullscreen scorecard-modal" onClick={e => e.stopPropagation()}>
        <div className="scorecard-header">
          <div className="scorecard-header-left">
            <h2>Scorecard Colloquio</h2>
            <span className="scorecard-candidate">{candidateName}</span>
          </div>
          <div className="scorecard-header-right">
            {templateDetails && (
              <div className="scorecard-progress">
                <div className="scorecard-progress-bar">
                  <div
                    className="scorecard-progress-fill"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  />
                </div>
                <span className="scorecard-progress-text">{getCompletionPercentage()}% completato</span>
              </div>
            )}
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="scorecard-body">
          {/* Template Selection */}
          {!templateDetails && (
            <div className="scorecard-template-select">
              <div className="template-select-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <h3>Seleziona Template di Valutazione</h3>
                <p>Scegli il template appropriato per la posizione del candidato</p>
              </div>
              <div className="template-grid">
                {templates.map(template => (
                  <button
                    key={template.id}
                    className="template-card"
                    onClick={() => handleTemplateChange(template.id)}
                  >
                    <div className="template-card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="9" x2="15" y2="9"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                        <line x1="9" y1="17" x2="12" y2="17"/>
                      </svg>
                    </div>
                    <span className="template-card-name">{template.name}</span>
                    {template.department && (
                      <span className="template-card-dept">{template.department}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scorecard Content */}
          {templateDetails && (
            <div className="scorecard-content">
              {/* Sidebar with categories */}
              <div className="scorecard-sidebar">
                <div className="scorecard-template-info">
                  <span className="scorecard-template-name">{templateDetails.name}</span>
                  <button
                    className="scorecard-change-template"
                    onClick={() => {
                      setTemplateDetails(null);
                      setSelectedTemplate(null);
                    }}
                  >
                    Cambia template
                  </button>
                </div>

                <nav className="scorecard-nav">
                  {templateDetails.categories.map((cat, idx) => {
                    const catScore = calculateCategoryScore(cat);
                    return (
                      <button
                        key={cat.id}
                        className={`scorecard-nav-item ${activeCategory === idx ? "active" : ""}`}
                        onClick={() => setActiveCategory(idx)}
                      >
                        <span className="nav-item-name">{cat.name}</span>
                        <span className="nav-item-weight">{Math.round((cat.weight || 1) * 100)}%</span>
                        {catScore !== "-" && (
                          <span className="nav-item-score">{catScore}</span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {templateDetails.questions?.length > 0 && (
                  <button
                    className={`scorecard-nav-item questions-toggle ${showQuestions ? "active" : ""}`}
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Domande Guida</span>
                  </button>
                )}

                <div className="scorecard-total">
                  <span className="total-label">Score Totale</span>
                  <span className="total-value">{calculateTotalScore() || "-"}/5</span>
                </div>
              </div>

              {/* Main scoring area */}
              <div className="scorecard-main">
                {showQuestions ? (
                  <div className="scorecard-questions">
                    <h3>Domande Guida</h3>
                    <div className="questions-list">
                      {templateDetails.questions.map((q, idx) => (
                        <div key={q.id} className="question-item">
                          <span className="question-number">{idx + 1}</span>
                          <span className="question-text">{q.question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="scorecard-criteria">
                    <div className="criteria-header">
                      <h3>{templateDetails.categories[activeCategory]?.name}</h3>
                      <span className="criteria-weight">
                        Peso: {Math.round((templateDetails.categories[activeCategory]?.weight || 1) * 100)}%
                      </span>
                    </div>

                    <div className="criteria-list">
                      {templateDetails.categories[activeCategory]?.criteria.map(crit => (
                        <div key={crit.id} className="criteria-item">
                          <div className="criteria-info">
                            <span className="criteria-name">{crit.name}</span>
                            {crit.description && (
                              <span className="criteria-desc">{crit.description}</span>
                            )}
                            <div className="criteria-scale">
                              {crit.description_low && (
                                <span className="scale-low">1: {crit.description_low}</span>
                              )}
                              {crit.description_high && (
                                <span className="scale-high">5: {crit.description_high}</span>
                              )}
                            </div>
                          </div>

                          <div className="criteria-score">
                            <div className="score-buttons">
                              {[1, 2, 3, 4, 5].map(score => (
                                <button
                                  key={score}
                                  className={`score-btn ${scores[crit.id]?.score === score ? "selected" : ""}`}
                                  onClick={() => handleScoreChange(crit.id, score)}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="criteria-notes">
                            <input
                              type="text"
                              placeholder="Note..."
                              value={scores[crit.id]?.notes || ""}
                              onChange={e => handleNoteChange(crit.id, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Navigation */}
                    <div className="criteria-navigation">
                      {activeCategory > 0 && (
                        <button
                          className="btn-secondary"
                          onClick={() => setActiveCategory(prev => prev - 1)}
                        >
                          Precedente
                        </button>
                      )}
                      {activeCategory < templateDetails.categories.length - 1 && (
                        <button
                          className="btn-primary"
                          onClick={() => setActiveCategory(prev => prev + 1)}
                        >
                          Successivo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with verdict */}
        {templateDetails && (
          <div className="scorecard-footer">
            <div className="verdict-section">
              <div className="verdict-recommendation">
                <label>Raccomandazione Finale</label>
                <div className="recommendation-options">
                  {recommendationOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`recommendation-btn ${verdict.recommendation === opt.value ? "selected" : ""}`}
                      style={{
                        "--rec-color": opt.color,
                        borderColor: verdict.recommendation === opt.value ? opt.color : undefined,
                        backgroundColor: verdict.recommendation === opt.value ? `${opt.color}15` : undefined
                      }}
                      onClick={() => setVerdict(prev => ({ ...prev, recommendation: opt.value }))}
                    >
                      <span className="rec-icon">{opt.icon}</span>
                      <span className="rec-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="verdict-notes">
                <label>Note Finali</label>
                <textarea
                  value={verdict.final_notes}
                  onChange={e => setVerdict(prev => ({ ...prev, final_notes: e.target.value }))}
                  placeholder="Commenti finali sul candidato..."
                  rows={3}
                />
              </div>
            </div>

            <div className="scorecard-actions">
              <button className="btn-secondary" onClick={onClose}>
                Annulla
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Salvataggio..." : "Salva Valutazione"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
