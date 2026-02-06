import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function StatsPageAdvanced() {
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [basicRes, advancedRes] = await Promise.all([
          api.get("/stats"),
          api.get("/stats/advanced")
        ]);
        setStats(basicRes.data);
        setAdvancedStats(advancedRes.data);
      } catch (err) {
        console.error("Errore caricamento statistiche", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const formatAction = (action) => {
    const actions = {
      create: "Creazione",
      update: "Modifica",
      delete: "Eliminazione",
      upload: "Upload",
      update_suitability: "Valutazione",
      pipeline_move: "Spostamento"
    };
    return actions[action] || action;
  };

  const formatEntity = (type) => {
    const entities = {
      candidate: "Candidato",
      interview: "Colloquio",
      document: "Documento",
      user: "Utente",
      scorecard_template: "Template Scorecard",
      interview_verdict: "Valutazione"
    };
    return entities[type] || type;
  };

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  const getTrendIcon = (value) => {
    if (value > 0) return <span className="trend-up">+{value}%</span>;
    if (value < 0) return <span className="trend-down">{value}%</span>;
    return <span className="trend-neutral">0%</span>;
  };

  const recommendationLabels = {
    strongly_recommended: "Molto consigliato",
    recommended: "Consigliato",
    with_reservations: "Con riserve",
    not_recommended: "Non consigliato"
  };

  const recommendationColors = {
    strongly_recommended: "#10b981",
    recommended: "#3b82f6",
    with_reservations: "#f59e0b",
    not_recommended: "#ef4444"
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento statistiche...</div>
      </div>
    );
  }

  if (!stats || !advancedStats) {
    return (
      <div className="page-wrapper">
        <div className="error-state">Errore nel caricamento delle statistiche</div>
      </div>
    );
  }

  const suitabilityTotal = (stats.suitabilityRates?.idonei || 0) +
    (stats.suitabilityRates?.nonIdonei || 0) +
    (stats.suitabilityRates?.daValutare || 0);

  // Calculate max for charts
  const maxCandidatesByMonth = Math.max(...(advancedStats.candidatesByMonth?.map(m => m.count) || [1]));
  const maxInterviewsByWeek = Math.max(...(advancedStats.interviewsByWeek?.map(w => w.count) || [1]));

  return (
    <div className="page-wrapper stats-advanced-page">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-content">
          <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title-modern">Dashboard Analytics</h1>
            <p className="page-subtitle-modern">Panoramica completa del processo di selezione</p>
          </div>
        </div>
        <div className="page-header-actions">
          <div className="stats-tabs">
            <button
              className={`stats-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Panoramica
            </button>
            <button
              className={`stats-tab ${activeTab === "pipeline" ? "active" : ""}`}
              onClick={() => setActiveTab("pipeline")}
            >
              Pipeline
            </button>
            <button
              className={`stats-tab ${activeTab === "performance" ? "active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              Performance
            </button>
          </div>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* KPI Cards Row */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon candidates">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{stats.totalCandidates}</span>
                <span className="kpi-label">Candidati Totali</span>
                {advancedStats.monthComparison && (
                  <span className="kpi-trend">
                    {getTrendIcon(advancedStats.monthComparison.candidatesTrend)} vs mese scorso
                  </span>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon interviews">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{stats.totalInterviews}</span>
                <span className="kpi-label">Colloqui Totali</span>
                {advancedStats.monthComparison && (
                  <span className="kpi-trend">
                    {getTrendIcon(advancedStats.monthComparison.interviewsTrend)} vs mese scorso
                  </span>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon today">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{advancedStats.interviewsToday || 0}</span>
                <span className="kpi-label">Colloqui Oggi</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon conversion">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{advancedStats.conversionMetrics?.conversionRate || 0}%</span>
                <span className="kpi-label">Tasso Conversione</span>
                <span className="kpi-subtitle">{advancedStats.conversionMetrics?.assunti || 0} assunti</span>
              </div>
            </div>

            {advancedStats.avgTimeToHire && (
              <div className="kpi-card">
                <div className="kpi-icon time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                  </svg>
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">{advancedStats.avgTimeToHire}</span>
                  <span className="kpi-label">Giorni Medi per Assunzione</span>
                </div>
              </div>
            )}

            {advancedStats.avgInterviewScore?.avg_score && (
              <div className="kpi-card">
                <div className="kpi-icon score">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">{advancedStats.avgInterviewScore.avg_score}/5</span>
                  <span className="kpi-label">Score Medio Colloqui</span>
                  <span className="kpi-subtitle">{advancedStats.avgInterviewScore.count} valutazioni</span>
                </div>
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="stats-charts-row">
            {/* Candidates Trend */}
            <div className="stats-card chart-card">
              <div className="stats-card-header">
                <h3>Candidati per Mese</h3>
                <span className="stats-card-subtitle">Ultimi 12 mesi</span>
              </div>
              <div className="stats-card-body">
                <div className="line-chart">
                  <svg viewBox="0 0 400 150" className="line-chart-svg">
                    {/* Grid lines */}
                    <g className="grid-lines">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line key={i} x1="40" y1={30 + i * 25} x2="390" y2={30 + i * 25} />
                      ))}
                    </g>
                    {/* Line path */}
                    {advancedStats.candidatesByMonth?.length > 0 && (
                      <>
                        <path
                          className="line-chart-area"
                          d={`M ${advancedStats.candidatesByMonth.map((m, i) => {
                            const x = 40 + (i * 350) / Math.max(advancedStats.candidatesByMonth.length - 1, 1);
                            const y = 130 - (m.count / maxCandidatesByMonth) * 100;
                            return `${x},${y}`;
                          }).join(' L ')} L ${40 + 350},130 L 40,130 Z`}
                        />
                        <path
                          className="line-chart-line"
                          d={`M ${advancedStats.candidatesByMonth.map((m, i) => {
                            const x = 40 + (i * 350) / Math.max(advancedStats.candidatesByMonth.length - 1, 1);
                            const y = 130 - (m.count / maxCandidatesByMonth) * 100;
                            return `${x},${y}`;
                          }).join(' L ')}`}
                          fill="none"
                        />
                        {/* Points */}
                        {advancedStats.candidatesByMonth.map((m, i) => {
                          const x = 40 + (i * 350) / Math.max(advancedStats.candidatesByMonth.length - 1, 1);
                          const y = 130 - (m.count / maxCandidatesByMonth) * 100;
                          return (
                            <g key={i} className="line-chart-point-group">
                              <circle cx={x} cy={y} r="4" className="line-chart-point" />
                              <title>{monthNames[parseInt(m.month.split('-')[1]) - 1]}: {m.count}</title>
                            </g>
                          );
                        })}
                      </>
                    )}
                    {/* X axis labels */}
                    {advancedStats.candidatesByMonth?.map((m, i) => {
                      const x = 40 + (i * 350) / Math.max(advancedStats.candidatesByMonth.length - 1, 1);
                      if (i % 2 === 0 || advancedStats.candidatesByMonth.length <= 6) {
                        return (
                          <text key={i} x={x} y="145" className="chart-label">{monthNames[parseInt(m.month.split('-')[1]) - 1]}</text>
                        );
                      }
                      return null;
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Suitability Distribution */}
            <div className="stats-card">
              <div className="stats-card-header">
                <h3>Distribuzione Idoneità</h3>
              </div>
              <div className="stats-card-body">
                <div className="donut-chart-container">
                  <svg viewBox="0 0 120 120" className="donut-chart">
                    {suitabilityTotal > 0 && (
                      <>
                        {/* Background circle */}
                        <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-color)" strokeWidth="12" />
                        {/* Idonei */}
                        <circle
                          cx="60" cy="60" r="45"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray={`${(stats.suitabilityRates?.idonei / suitabilityTotal) * 283} 283`}
                          strokeDashoffset="0"
                          transform="rotate(-90 60 60)"
                        />
                        {/* Non Idonei */}
                        <circle
                          cx="60" cy="60" r="45"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="12"
                          strokeDasharray={`${(stats.suitabilityRates?.nonIdonei / suitabilityTotal) * 283} 283`}
                          strokeDashoffset={`${-((stats.suitabilityRates?.idonei / suitabilityTotal) * 283)}`}
                          transform="rotate(-90 60 60)"
                        />
                        {/* Da Valutare */}
                        <circle
                          cx="60" cy="60" r="45"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray={`${(stats.suitabilityRates?.daValutare / suitabilityTotal) * 283} 283`}
                          strokeDashoffset={`${-(((stats.suitabilityRates?.idonei + stats.suitabilityRates?.nonIdonei) / suitabilityTotal) * 283)}`}
                          transform="rotate(-90 60 60)"
                        />
                        <text x="60" y="55" className="donut-center-value">{suitabilityTotal}</text>
                        <text x="60" y="70" className="donut-center-label">Totale</text>
                      </>
                    )}
                  </svg>
                  <div className="donut-legend">
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#10b981" }} />
                      <span>Idonei</span>
                      <span className="legend-value">{stats.suitabilityRates?.idonei || 0}</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#ef4444" }} />
                      <span>Non idonei</span>
                      <span className="legend-value">{stats.suitabilityRates?.nonIdonei || 0}</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#f59e0b" }} />
                      <span>Da valutare</span>
                      <span className="legend-value">{stats.suitabilityRates?.daValutare || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Positions and Status Row */}
          <div className="stats-charts-row">
            {/* Candidates by Position */}
            {advancedStats.candidatesByPosition?.length > 0 && (
              <div className="stats-card">
                <div className="stats-card-header">
                  <h3>Candidati per Posizione</h3>
                </div>
                <div className="stats-card-body">
                  <div className="horizontal-bars">
                    {advancedStats.candidatesByPosition.slice(0, 6).map((pos, idx) => {
                      const maxCount = advancedStats.candidatesByPosition[0]?.count || 1;
                      const percentage = (pos.count / maxCount) * 100;
                      return (
                        <div key={idx} className="h-bar-item">
                          <div className="h-bar-label">
                            <span>{pos.position_applied}</span>
                            <span className="h-bar-value">{pos.count}</span>
                          </div>
                          <div className="h-bar-track">
                            <div className="h-bar-fill" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Interview Status */}
            <div className="stats-card">
              <div className="stats-card-header">
                <h3>Stato Colloqui</h3>
              </div>
              <div className="stats-card-body">
                <div className="status-grid">
                  <div className="status-item status-scheduled">
                    <span className="status-count">{stats.interviewsByStatus?.Programmato || 0}</span>
                    <span className="status-name">Programmati</span>
                  </div>
                  <div className="status-item status-completed">
                    <span className="status-count">{stats.interviewsByStatus?.Completato || 0}</span>
                    <span className="status-name">Completati</span>
                  </div>
                  <div className="status-item status-cancelled">
                    <span className="status-count">{stats.interviewsByStatus?.Annullato || 0}</span>
                    <span className="status-name">Annullati</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "pipeline" && (
        <>
          {/* Pipeline Funnel */}
          <div className="stats-card full-width">
            <div className="stats-card-header">
              <h3>Funnel di Selezione</h3>
              <Link to="/pipeline" className="stats-card-link">Vedi Pipeline</Link>
            </div>
            <div className="stats-card-body">
              <div className="funnel-chart">
                {advancedStats.pipelineFunnel?.map((stage, idx) => {
                  const maxCount = advancedStats.pipelineFunnel[0]?.count || 1;
                  const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                  const totalCandidates = advancedStats.pipelineFunnel.reduce((sum, s) => sum + s.count, 0);
                  const stagePercentage = totalCandidates > 0 ? Math.round((stage.count / totalCandidates) * 100) : 0;
                  return (
                    <div key={idx} className="funnel-stage">
                      <div className="funnel-bar-container">
                        <div
                          className="funnel-bar"
                          style={{
                            width: `${Math.max(percentage, 5)}%`,
                            backgroundColor: stage.color
                          }}
                        >
                          <span className="funnel-count">{stage.count}</span>
                        </div>
                      </div>
                      <div className="funnel-label">
                        <span className="funnel-name">{stage.name}</span>
                        <span className="funnel-percentage">{stagePercentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conversion Metrics */}
          <div className="stats-charts-row">
            <div className="stats-card">
              <div className="stats-card-header">
                <h3>Metriche Conversione</h3>
              </div>
              <div className="stats-card-body">
                <div className="conversion-metrics">
                  <div className="conversion-metric">
                    <div className="conversion-circle" style={{ '--progress': `${advancedStats.conversionMetrics?.conversionRate || 0}%` }}>
                      <span className="conversion-value">{advancedStats.conversionMetrics?.conversionRate || 0}%</span>
                    </div>
                    <span className="conversion-label">Tasso di Assunzione</span>
                  </div>
                  <div className="conversion-stats">
                    <div className="conv-stat">
                      <span className="conv-stat-value">{advancedStats.conversionMetrics?.totale || 0}</span>
                      <span className="conv-stat-label">Candidati totali</span>
                    </div>
                    <div className="conv-stat">
                      <span className="conv-stat-value">{advancedStats.conversionMetrics?.assunti || 0}</span>
                      <span className="conv-stat-label">Assunti</span>
                    </div>
                    <div className="conv-stat">
                      <span className="conv-stat-value">{advancedStats.avgTimeToHire || '-'}</span>
                      <span className="conv-stat-label">Giorni medi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Distribution */}
            {Object.keys(advancedStats.recommendationDistribution || {}).length > 0 && (
              <div className="stats-card">
                <div className="stats-card-header">
                  <h3>Distribuzione Raccomandazioni</h3>
                </div>
                <div className="stats-card-body">
                  <div className="recommendation-bars">
                    {Object.entries(advancedStats.recommendationDistribution).map(([rec, count]) => {
                      const total = Object.values(advancedStats.recommendationDistribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={rec} className="rec-bar-item">
                          <div className="rec-bar-label">
                            <span style={{ color: recommendationColors[rec] }}>{recommendationLabels[rec]}</span>
                            <span className="rec-bar-value">{count}</span>
                          </div>
                          <div className="rec-bar-track">
                            <div
                              className="rec-bar-fill"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: recommendationColors[rec]
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          {/* Interviews by Week */}
          <div className="stats-card chart-card">
            <div className="stats-card-header">
              <h3>Colloqui per Settimana</h3>
              <span className="stats-card-subtitle">Ultime 8 settimane</span>
            </div>
            <div className="stats-card-body">
              <div className="bar-chart">
                {advancedStats.interviewsByWeek?.map((week, idx) => {
                  const height = maxInterviewsByWeek > 0 ? (week.count / maxInterviewsByWeek) * 100 : 0;
                  return (
                    <div key={idx} className="bar-chart-item">
                      <div className="bar-chart-bar-container">
                        <div
                          className="bar-chart-bar"
                          style={{ height: `${height}%` }}
                        >
                          {week.count > 0 && <span className="bar-chart-value">{week.count}</span>}
                        </div>
                      </div>
                      <span className="bar-chart-label">S{week.week.split('-')[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          {advancedStats.interviewHeatmap?.length > 0 && (
            <div className="stats-card full-width">
              <div className="stats-card-header">
                <h3>Heatmap Colloqui</h3>
                <span className="stats-card-subtitle">Distribuzione per giorno e ora (ultimi 3 mesi)</span>
              </div>
              <div className="stats-card-body">
                <div className="heatmap">
                  <div className="heatmap-y-labels">
                    {[9, 10, 11, 12, 14, 15, 16, 17, 18].map(hour => (
                      <span key={hour} className="heatmap-label">{hour}:00</span>
                    ))}
                  </div>
                  <div className="heatmap-grid">
                    {[1, 2, 3, 4, 5].map(day => (
                      <div key={day} className="heatmap-row">
                        {[9, 10, 11, 12, 14, 15, 16, 17, 18].map(hour => {
                          const cell = advancedStats.interviewHeatmap.find(
                            h => parseInt(h.day_of_week) === day && parseInt(h.hour) === hour
                          );
                          const count = cell?.count || 0;
                          const maxCount = Math.max(...advancedStats.interviewHeatmap.map(h => h.count));
                          const intensity = maxCount > 0 ? count / maxCount : 0;
                          return (
                            <div
                              key={`${day}-${hour}`}
                              className="heatmap-cell"
                              style={{
                                backgroundColor: count > 0
                                  ? `rgba(79, 70, 229, ${0.2 + intensity * 0.8})`
                                  : 'var(--bg-secondary)'
                              }}
                              title={`${dayNames[day]} ${hour}:00 - ${count} colloqui`}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div className="heatmap-x-labels">
                      {[1, 2, 3, 4, 5].map(day => (
                        <span key={day} className="heatmap-label">{dayNames[day]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {stats.recentActivity && stats.recentActivity.length > 0 && (
            <div className="stats-card">
              <div className="stats-card-header">
                <h3>Attività Recenti</h3>
              </div>
              <div className="stats-card-body">
                <div className="activity-list">
                  {stats.recentActivity.map((activity, idx) => (
                    <div key={idx} className="activity-item">
                      <div className={`activity-icon activity-${activity.action}`}>
                        {activity.action === "create" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                        {(activity.action === "update" || activity.action === "pipeline_move") && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        )}
                        {activity.action === "delete" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        )}
                        {(activity.action === "upload" || activity.action === "update_suitability") && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        )}
                      </div>
                      <div className="activity-content">
                        <span className="activity-text">
                          <strong>{activity.user_email}</strong> ha effettuato {formatAction(activity.action).toLowerCase()} di {formatEntity(activity.entity_type).toLowerCase()}
                        </span>
                        <span className="activity-time">
                          {new Date(activity.created_at).toLocaleString("it-IT")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Section */}
      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Esporta Dati</h3>
        </div>
        <div className="stats-card-body">
          <div className="export-buttons">
            <a href="/api/export/candidates" className="export-btn" download>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Candidati (CSV)
            </a>
            <a href="/api/export/interviews" className="export-btn" download>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Colloqui (CSV)
            </a>
            <a href="/api/export/stats" className="export-btn export-btn-primary" download>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Report Completo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
