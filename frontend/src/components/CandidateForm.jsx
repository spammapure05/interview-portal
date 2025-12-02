import { useState } from "react";
import api from "../api";

export default function CandidateForm({ onSaved }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    setLoading(true);
    try {
      await api.post("/candidates", {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        notes
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNotes("");
      onSaved && onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-inline">
      <h2>➕ Nuovo Candidato</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span className="input-label">Nome *</span>
            <input
              type="text"
              placeholder="Inserisci nome"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              disabled={loading}
            />
          </label>
          <label>
            <span className="input-label">Cognome *</span>
            <input
              type="text"
              placeholder="Inserisci cognome"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>
        <label>
          <span className="input-label">Email</span>
          <input
            type="email"
            placeholder="esempio@azienda.it"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </label>
        <label>
          <span className="input-label">Telefono</span>
          <input
            type="text"
            placeholder="+39 123 456 7890"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={loading}
          />
        </label>
        <label>
          <span className="input-label">Note</span>
          <textarea
            placeholder="Aggiungi note sul candidato..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={loading}
            style={{ minHeight: "100px", resize: "vertical" }}
          />
        </label>
        <button
          type="submit"
          className="btn-primary"
          disabled={!firstName || !lastName || loading}
          style={{ marginTop: "0.5rem" }}
        >
          {loading ? "Salvataggio..." : "Salva Candidato"}
        </button>
      </form>
    </div>
  );
}
