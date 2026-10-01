// Ports the multi-owner editor markup in rHF plus hfAddOwner/hfRemoveOwner/hfCheckPct
// (public/legacy-app.js:1589-1604, 3559-3581) as a controlled component instead of
// direct DOM node creation/removal.
export function OwnerSplitEditor({ owners, onChange }) {
  const totalPct = owners.reduce((s, o) => s + (Number(o.pct) || 0), 0);
  const showWarning = owners.length > 1 && Math.abs(totalPct - 100) > 0.5;

  function updateOwner(i, field, value) {
    onChange(owners.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }
  function addOwner() {
    onChange([...owners, { nombre: "", pct: 0 }]);
  }
  function removeOwner(i) {
    if (owners.length <= 1) return;
    onChange(owners.filter((_, idx) => idx !== i));
  }

  return (
    <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem" }}>
      <div
        style={{
          fontSize: ".7rem",
          fontWeight: 700,
          color: "var(--gr)",
          textTransform: "uppercase",
          letterSpacing: ".07em",
          marginBottom: ".6rem",
        }}
      >
        👥 Propietarios
      </div>
      {owners.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: ".5rem", alignItems: "center", marginBottom: ".5rem" }}>
          <input
            value={o.nombre || ""}
            placeholder="Nombre propietario"
            onChange={(e) => updateOwner(i, "nombre", e.target.value)}
            style={{
              flex: 1,
              fontSize: ".88rem",
              padding: ".5rem .65rem",
              border: "1px solid var(--li)",
              borderRadius: "8px",
              background: "#fff",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".2rem",
              background: "var(--ar)",
              borderRadius: "8px",
              padding: ".3rem .5rem",
              flexShrink: 0,
            }}
          >
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={o.pct ?? 100}
              onChange={(e) => updateOwner(i, "pct", Number(e.target.value) || 0)}
              style={{ width: "3rem", border: "none", background: "none", fontSize: ".88rem", fontWeight: 700, textAlign: "center" }}
            />
            <span style={{ fontSize: ".78rem", color: "var(--gr)", fontWeight: 700 }}>%</span>
          </div>
          {owners.length > 1 && (
            <button
              type="button"
              onClick={() => removeOwner(i)}
              style={{ background: "none", border: "none", color: "#C9C2B4", fontSize: ".9rem", cursor: "pointer", padding: ".1rem .2rem" }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btg btsm" onClick={addOwner}>
        + Añadir propietario
      </button>
      {showWarning && (
        <div style={{ fontSize: ".72rem", color: "#e07a00", marginTop: ".4rem" }}>
          ⚠️ Los porcentajes deben sumar 100%
        </div>
      )}
    </div>
  );
}
