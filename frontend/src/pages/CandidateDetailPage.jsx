import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import CandidateForm from "../components/CandidateForm";
import InterviewForm from "../components/InterviewForm";
import FeedbackForm from "../components/FeedbackForm";
import DocumentsSection from "../components/DocumentsSection";
import { useAuth } from "../authContext";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [editInterview, setEditInterview] = useState(null);
  const [feedbackInterview, setFeedbackInterview] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [suitabilityLoading, setSuitabilityLoading] = useState(false);
  const { user } = useAuth();

  const updateSuitability = async (newValue) => {
    setSuitabilityLoading(true);
    try {
      await api.patch(`/candidates/${id}/suitability`, { suitability: newValue });
      load();
    } catch (err) {
      console.error("Errore aggiornamento idoneità", err);
    } finally {
      setSuitabilityLoading(false);
    }
  };

  const getSuitabilityClass = (suitability) => {
    switch (suitability) {
      case "Idoneo": return "suitability-suitable";
      case "Non idoneo": return "suitability-not-suitable";
      default: return "suitability-pending";
    }
  };

  const load = async () => {
    const [candRes, intRes] = await Promise.all([
      api.get(`/candidates/${id}`),
      api.get(`/interviews?candidate_id=${id}`)
    ]);
    setCandidate(candRes.data);
    setInterviews(intRes.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const getStatusClass = (status) => {
    switch (status) {
      case "Programmato": return "status-scheduled";
      case "Completato": return "status-completed";
      case "Annullato": return "status-cancelled";
      default: return "";
    }
  };

  if (!candidate) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/candidates" className="breadcrumb-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          Candidati
        </Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="breadcrumb-separator">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="breadcrumb-current">{candidate.last_name} {candidate.first_name}</span>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {candidate.first_name?.charAt(0)}{candidate.last_name?.charAt(0)}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{candidate.last_name} {candidate.first_name}</h1>
            <div className="profile-meta">
              {candidate.email && (
                <span className="profile-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {candidate.email}
                </span>
              )}
              {candidate.phone && (
                <span className="profile-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  {candidate.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <span className={`suitability-badge ${getSuitabilityClass(candidate.suitability)}`}>
            {candidate.suitability === "Idoneo" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            {candidate.suitability === "Non idoneo" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
            {(!candidate.suitability || candidate.suitability === "Da valutare") && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            {candidate.suitability || "Da valutare"}
          </span>
          {user && ["admin", "secretary"].includes(user.role) && (
            <button className="btn-edit-profile" onClick={() => setEditMode(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifica
            </button>
          )}
        </div>
      </div>

      {/* Suitability Section - Admin only */}
      {user && user.role === "admin" && (
        <div className="suitability-card">
          <div className="suitability-card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h2>Valutazione Candidato</h2>
          </div>
          <div className="suitability-options">
            <button
              className={`suitability-option ${candidate.suitability === "Da valutare" || !candidate.suitability ? "active" : ""} option-pending`}
              onClick={() => updateSuitability("Da valutare")}
              disabled={suitabilityLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Da valutare
            </button>
            <button
              className={`suitability-option ${candidate.suitability === "Idoneo" ? "active" : ""} option-suitable`}
              onClick={() => updateSuitability("Idoneo")}
              disabled={suitabilityLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Idoneo
            </button>
            <button
              className={`suitability-option ${candidate.suitability === "Non idoneo" ? "active" : ""} option-not-suitable`}
              onClick={() => updateSuitability("Non idoneo")}
              disabled={suitabilityLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Non idoneo
            </button>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {candidate.notes && (
        <div className="detail-card">
          <div className="detail-card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h2>Note</h2>
          </div>
          <p className="detail-card-content">{candidate.notes}</p>
        </div>
      )}

      {/* Documents Section */}
      <DocumentsSection
        candidateId={id}
        canEdit={user && ["admin", "secretary"].includes(user.role)}
        canDelete={user && user.role === "admin"}
      />

      {/* Interviews Section */}
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="section-title-group">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h2>Colloqui ({interviews.length})</h2>
          </div>
        </div>

        {interviews.length === 0 ? (
          <div className="empty-state-compact">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>Nessun colloquio registrato per questo candidato</p>
          </div>
        ) : (
          <div className="interviews-list">
            {interviews.map(i => (
              <div key={i.id} className="interview-detail-card">
                <div className="interview-detail-header">
                  <div className="interview-detail-datetime">
                    <div className="datetime-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {new Date(i.scheduled_at).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="datetime-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {new Date(i.scheduled_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="interview-detail-actions">
                    <span className={`status-badge-modern ${getStatusClass(i.status)}`}>
                      {i.status}
                    </span>
                    {user && ["admin", "secretary"].includes(user.role) && (
                      <div className="action-buttons">
                        <button className="btn-icon-small" title="Modifica" onClick={() => setEditInterview(i)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {user.role === "admin" && (
                          <button className="btn-icon-small btn-feedback-icon" title="Valutazione" onClick={() => setFeedbackInterview(i)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                        )}
                        {i.status === "Programmato" && (
                          <button className="btn-icon-small btn-danger-icon" title="Annulla" onClick={() => setCancelConfirm(i)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="15" y1="9" x2="9" y2="15"/>
                              <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="interview-detail-body">
                  <div className="interview-detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{i.location || "Luogo non specificato"}</span>
                  </div>

                  {i.feedback && (
                    <div className="interview-feedback-section">
                      <h4>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Feedback
                      </h4>
                      <p>{i.feedback}</p>
                    </div>
                  )}

                  {(i.strengths || i.weaknesses) && (
                    <div className="interview-evaluation">
                      {i.strengths && (
                        <div className="evaluation-item evaluation-strengths">
                          <h4>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            Punti di forza
                          </h4>
                          <p>{i.strengths}</p>
                        </div>
                      )}
                      {i.weaknesses && (
                        <div className="evaluation-item evaluation-weaknesses">
                          <h4>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Aree di miglioramento
                          </h4>
                          <p>{i.weaknesses}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Candidate Modal */}
      {editMode && (
        <div className="modal-overlay" onClick={() => setEditMode(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifica Candidato</h2>
              <button className="modal-close" onClick={() => setEditMode(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <CandidateForm candidate={candidate} onSaved={() => { setEditMode(false); load(); }} />
          </div>
        </div>
      )}

      {/* Edit Interview Modal */}
      {editInterview && (
        <div className="modal-overlay" onClick={() => setEditInterview(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifica Colloquio</h2>
              <button className="modal-close" onClick={() => setEditInterview(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <InterviewForm
              interview={editInterview}
              onSaved={() => { setEditInterview(null); load(); }}
              onCancel={() => setEditInterview(null)}
            />
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirm && (
        <div className="modal-overlay" onClick={() => setCancelConfirm(null)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Conferma Annullamento</h2>
              <button className="modal-close" onClick={() => setCancelConfirm(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Sei sicuro di voler annullare questo colloquio?</p>
              <div className="confirm-details">
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {new Date(cancelConfirm.scheduled_at).toLocaleString("it-IT")}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCancelConfirm(null)}>
                No, torna indietro
              </button>
              <button
                className="btn-danger"
                onClick={async () => {
                  await api.put(`/interviews/${cancelConfirm.id}`, { status: "Annullato" });
                  setCancelConfirm(null);
                  load();
                }}
              >
                Sì, annulla colloquio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackInterview && (
        <div className="modal-overlay" onClick={() => setFeedbackInterview(null)}>
          <div className="modal-content modal-feedback" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Valutazione Colloquio</h2>
              <button className="modal-close" onClick={() => setFeedbackInterview(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <FeedbackForm
              interview={feedbackInterview}
              onSaved={() => { setFeedbackInterview(null); load(); }}
              onCancel={() => setFeedbackInterview(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
