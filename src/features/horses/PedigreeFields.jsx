import { HorsetelexImportButton } from "./HorsetelexImportButton.jsx";

// Ports the pedigree section of rHF (public/legacy-app.js:1606-1632).
export function PedigreeFields({ pedigree, onFieldChange, horsetelex, onHorsetelexChange, onImport, current }) {
  const parents = [
    ["sire", "Padre", "Nombre del padre"],
    ["dam", "Madre", "Nombre de la madre"],
  ];
  const paternalGrandparents = [
    ["gsire", "Abuelo paterno", ""],
    ["gdam", "Abuela paterna", ""],
  ];
  const maternalGrandparents = [
    ["mgsire", "Abuelo materno", ""],
    ["mgdam", "Abuela materna", ""],
  ];

  function row(fields) {
    return (
      <div className="r2">
        {fields.map(([key, label, placeholder]) => (
          <div className="f" key={key}>
            <label>{label}</label>
            <input
              value={pedigree[key] || ""}
              placeholder={placeholder}
              onChange={(e) => onFieldChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--li)", borderRadius: "11px", padding: ".85rem", marginBottom: ".85rem" }}>
      <div
        style={{
          fontSize: ".7rem",
          fontWeight: 700,
          color: "var(--gr)",
          textTransform: "uppercase",
          letterSpacing: ".07em",
          marginBottom: ".65rem",
        }}
      >
        🧬 Pedigree
      </div>
      {row(parents)}
      {row(paternalGrandparents)}
      {row(maternalGrandparents)}
      <div className="f" style={{ marginBottom: 0 }}>
        <label>Enlace Horsetelex</label>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <input
            value={horsetelex}
            placeholder="https://www.horsetelex.com/horses/..."
            onChange={(e) => onHorsetelexChange(e.target.value)}
            style={{ flex: 1 }}
          />
          {horsetelex ? (
            <a href={horsetelex} target="_blank" rel="noopener" className="btn btsm" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              Ver →
            </a>
          ) : (
            <a
              href="https://www.horsetelex.com"
              target="_blank"
              rel="noopener"
              className="btn btg btsm"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Buscar
            </a>
          )}
        </div>
        <HorsetelexImportButton current={current} onImport={onImport} />
      </div>
    </div>
  );
}
