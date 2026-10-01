// Generic `.tabs`/`.tab` renderer (e.g. public/legacy-app.js:1691-1696). `tabs` is a
// pre-filtered array of {key, label} — permission gating happens in the caller, same as
// legacy's inline `${canX ? '<button ...>' : ''}` conditionals.
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={"tab" + (active === t.key ? " active" : "")}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
