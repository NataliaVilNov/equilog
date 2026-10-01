import { useContext, useState } from "react";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";

// Ports the #create-stable-modal markup + showCreateStable()/doCreateStable()
// (index.html:67-75, public/legacy-app.js:459-492).
export function CreateStableModal({ onClose }) {
  const { createStable } = useContext(StableSelectionContext) || {};
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createStable({ name, description });
      onClose();
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 510,
        background: "rgba(44,41,37,.55)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--fo)",
          borderRadius: "18px 18px 0 0",
          padding: "1.5rem 1rem 2.5rem",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Nueva cuadra</h2>
        <div className="f">
          <label>Nombre de la cuadra *</label>
          <input
            placeholder="Ej: Cuadra El Pinar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="f">
          <label>Descripción (opcional)</label>
          <input
            placeholder="Ej: Cuadra familiar en Sevilla"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && (
          <div style={{ fontSize: ".78rem", color: "var(--ro)", marginBottom: ".75rem" }}>
            {error}
          </div>
        )}
        <button className="btn bts btbl" onClick={handleSubmit} disabled={submitting}>
          Crear cuadra
        </button>
      </div>
    </div>
  );
}
