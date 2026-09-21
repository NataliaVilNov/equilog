// Ports the `.sw` search input (public/legacy-app.js:1551).
export function HorseSearchBar({ value, onChange }) {
  return (
    <div className="sw">
      <span className="sic">🔍</span>
      <input
        type="text"
        placeholder="Buscar caballo..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
