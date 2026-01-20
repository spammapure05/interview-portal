import { useEffect, useState, useRef } from "react";
import api from "../api";

const CATEGORIES = {
  cv: { label: "CV", color: "#8B5CF6" },
  cover_letter: { label: "Lettera Motivazionale", color: "#3B82F6" },
  certificate: { label: "Certificato", color: "#10B981" },
  id_document: { label: "Documento Identità", color: "#F59E0B" },
  other: { label: "Altro", color: "#6B7280" }
};

export default function DocumentsSection({ candidateId, canEdit, canDelete }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("cv");
  const [filterCategory, setFilterCategory] = useState("all");
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await api.get(`/documents/candidate/${candidateId}`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Errore caricamento documenti", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [candidateId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", selectedCategory);

    try {
      await api.post(`/documents/candidate/${candidateId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Errore durante l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, {
        responseType: "blob"
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Errore durante il download");
    }
  };

  const handlePreview = (doc) => {
    // Only preview PDF and images
    if (doc.mime_type?.includes("pdf") || doc.mime_type?.includes("image")) {
      setPreviewDoc(doc);
    } else {
      // For other types, download instead
      handleDownload(doc);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Errore durante l'eliminazione");
    }
  };

  const handleCategoryChange = async (docId, newCategory) => {
    try {
      await api.patch(`/documents/${docId}`, { category: newCategory });
      load();
    } catch (err) {
      alert("Errore aggiornamento categoria");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes("pdf")) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      );
    }
    if (mimeType?.includes("image")) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  };

  const canPreview = (mimeType) => {
    return mimeType?.includes("pdf") || mimeType?.includes("image");
  };

  const filteredDocs = filterCategory === "all"
    ? documents
    : documents.filter(d => (d.category || "other") === filterCategory);

  // Group documents by category
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    const cat = doc.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="documents-section">
      <div className="documents-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Documenti
          <span className="documents-count">{documents.length}</span>
        </h3>
        {canEdit && (
          <div className="upload-controls">
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <label className="upload-btn">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
              {uploading ? (
                <span className="uploading">
                  <span className="spinner-small"></span>
                  Caricamento...
                </span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Carica
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Category Filter */}
      {documents.length > 0 && (
        <div className="documents-filter">
          <button
            className={`filter-chip ${filterCategory === "all" ? "active" : ""}`}
            onClick={() => setFilterCategory("all")}
          >
            Tutti ({documents.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, val]) => {
            const count = documents.filter(d => (d.category || "other") === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                className={`filter-chip ${filterCategory === key ? "active" : ""}`}
                onClick={() => setFilterCategory(key)}
                style={{ "--chip-color": val.color }}
              >
                {val.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="documents-loading">Caricamento...</div>
      ) : documents.length === 0 ? (
        <div className="documents-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Nessun documento caricato</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="documents-empty">
          <p>Nessun documento in questa categoria</p>
        </div>
      ) : (
        <div className="documents-list">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="document-item">
              <div
                className="document-icon"
                style={{ backgroundColor: CATEGORIES[doc.category || "other"]?.color + "20" }}
              >
                {getFileIcon(doc.mime_type)}
              </div>
              <div className="document-info">
                <span className="document-name">{doc.original_name}</span>
                <span className="document-meta">
                  <span
                    className="document-category-badge"
                    style={{ backgroundColor: CATEGORIES[doc.category || "other"]?.color }}
                  >
                    {CATEGORIES[doc.category || "other"]?.label}
                  </span>
                  {formatFileSize(doc.size)} • {new Date(doc.uploaded_at).toLocaleDateString("it-IT")}
                </span>
              </div>
              <div className="document-actions">
                {canPreview(doc.mime_type) && (
                  <button className="btn-icon-small" title="Anteprima" onClick={() => handlePreview(doc)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                )}
                <button className="btn-icon-small" title="Scarica" onClick={() => handleDownload(doc)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                {canEdit && (
                  <select
                    className="category-select-small"
                    value={doc.category || "other"}
                    onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
                    title="Cambia categoria"
                  >
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                )}
                {canDelete && (
                  <button className="btn-icon-small btn-danger-icon" title="Elimina" onClick={() => setDeleteConfirm(doc)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay preview-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewDoc.original_name}</h3>
              <div className="preview-actions">
                <button className="btn-icon" title="Scarica" onClick={() => handleDownload(previewDoc)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button className="btn-icon" onClick={() => setPreviewDoc(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="preview-content">
              {previewDoc.mime_type?.includes("pdf") ? (
                <iframe
                  src={`/api/documents/${previewDoc.id}/preview`}
                  title={previewDoc.original_name}
                />
              ) : previewDoc.mime_type?.includes("image") ? (
                <img
                  src={`/api/documents/${previewDoc.id}/preview`}
                  alt={previewDoc.original_name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
              <p>Sei sicuro di voler eliminare <strong>{deleteConfirm.original_name}</strong>?</p>
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
