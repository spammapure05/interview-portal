import { useState } from "react";
import api from "../api";

export default function CandidateForm({ onSaved }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
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
  };

  return (
    <form className="card card-inline" onSubmit={handleSubmit}>
      <h2>Nuovo candidato</h2>
      <label>
        Nome
        <input
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
      </label>
      <label>
        Cognome
        <input value={lastName} onChange={e => setLastName(e.target.value)} />
      </label>
      <label>
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label>
        Telefono
        <input value={phone} onChange={e => setPhone(e.target.value)} />
      </label>
      <label>
        Note
        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
      </label>
      <button type="submit" disabled={!firstName || !lastName}>
        Salva
      </button>
    </form>
  );
}
