import { useEffect, useState } from "react";
import api from "../api";

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get("/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Errore caricamento statistiche", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const exportCandidates = async () => {
    try {
      const res = await api.get("/stats/export/candidates");
      downloadCSV(res.data, "candidati");
    } catch (err) {
      console.error("Errore export", err);
    }
  };

  const exportInterviews = async () => {
    try {
      const res = await api.get("/stats/export/interviews");
      downloadCSV(res.data, "colloqui");
    } catch (err) {
      console.error("Errore export", err);
    }
  };

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert("Nessun dato da esportare");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(";"),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(";") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
        }).join(";")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAction = (action) => {
    const actions = {
      create: "Creazione",
      update: "Modifica",
      delete: "Eliminazione",
      upload: "Upload",
      update_suitability: "Valutazione"
    };
    return actions[action] || action;
  };

  const formatEntity = (type) => {
    const entities = {
      candidate: "Candidato",
      interview: "Colloquio",
      document: "Documento",
      user: "Utente"
    };
    return entities[type] || type;
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Caricamento statistiche...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-wrapper">
        <div className="error-state">Errore nel caricamento delle statistiche</div>
      </div>
    );
  }

  const suitabilityTotal = (stats.suitabilityRates?.idonei || 0) +
    (stats.suitabilityRates?.nonIdonei || 0) +
    (stats.suitabilityRates?.daValutare || 0);

  return (
    <div className="page-wrapper">
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
            <h1 className="page-title-modern">Statistiche e Report</h1>
            <p className="page-subtitle-modern">Panoramica dei dati e esportazioni</p>
          </div>
        </div>
      </div>

      <div className="stats-page-content">
        {/* Overview Cards */}
        <div className="stats-overview-grid">
          <div className="stats-overview-card">
            <div className="stats-overview-icon candidates">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div className="stats-overview-data">
              <span className="stats-overview-value">{stats.totalCandidates}</span>
              <span className="stats-overview-label">Candidati totali</span>
            </div>
          </div>

          <div className="stats-overview-card">
            <div className="stats-overview-icon interviews">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
              </svg>
            </div>
            <div className="stats-overview-data">
              <span className="stats-overview-value">{stats.totalInterviews}</span>
              <span className="stats-overview-label">Colloqui totali</span>
            </div>
          </div>

          <div className="stats-overview-card">
            <div className="stats-overview-icon upcoming">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stats-overview-data">
              <span className="stats-overview-value">{stats.upcomingWeek}</span>
              <span className="stats-overview-label">Prossimi 7 giorni</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="stats-charts-row">
          {/* Suitability Distribution */}
          <div className="stats-card">
            <div className="stats-card-header">
              <h3>Distribuzione Idoneità</h3>
            </div>
            <div className="stats-card-body">
              <div className="suitability-bars">
                <div className="suitability-bar-item">
                  <div className="bar-label">
                    <span>Idonei</span>
                    <span className="bar-value">{stats.suitabilityRates?.idonei || 0}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-suitable"
                      style={{ width: `${suitabilityTotal ? ((stats.suitabilityRates?.idonei || 0) / suitabilityTotal * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div className="suitability-bar-item">
                  <div className="bar-label">
                    <span>Non idonei</span>
                    <span className="bar-value">{stats.suitabilityRates?.nonIdonei || 0}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-not-suitable"
                      style={{ width: `${suitabilityTotal ? ((stats.suitabilityRates?.nonIdonei || 0) / suitabilityTotal * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div className="suitability-bar-item">
                  <div className="bar-label">
                    <span>Da valutare</span>
                    <span className="bar-value">{stats.suitabilityRates?.daValutare || 0}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-pending"
                      style={{ width: `${suitabilityTotal ? ((stats.suitabilityRates?.daValutare || 0) / suitabilityTotal * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interviews by Status */}
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

        {/* Monthly Trend */}
        {stats.interviewsByMonth && stats.interviewsByMonth.length > 0 && (
          <div className="stats-card">
            <div className="stats-card-header">
              <h3>Trend Colloqui (ultimi 6 mesi)</h3>
            </div>
            <div className="stats-card-body">
              <div className="monthly-chart">
                {stats.interviewsByMonth.map((item, idx) => {
                  const maxCount = Math.max(...stats.interviewsByMonth.map(i => i.count));
                  const height = maxCount ? (item.count / maxCount * 100) : 0;
                  const [year, month] = item.month.split("-");
                  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
                  return (
                    <div key={idx} className="chart-bar-container">
                      <div className="chart-bar-wrapper">
                        <div className="chart-bar" style={{ height: `${height}%` }}>
                          <span className="chart-bar-value">{item.count}</span>
                        </div>
                      </div>
                      <span className="chart-bar-label">{monthNames[parseInt(month) - 1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Export Section */}
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Esporta Dati</h3>
          </div>
          <div className="stats-card-body">
            <div className="export-buttons">
              <button className="export-btn" onClick={exportCandidates}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Esporta Candidati (CSV)
              </button>
              <button className="export-btn" onClick={exportInterviews}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Esporta Colloqui (CSV)
              </button>
            </div>
          </div>
        </div>

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
                      {activity.action === "update" && (
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
      </div>
    </div>
  );
}
