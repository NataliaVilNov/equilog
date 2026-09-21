// Ports the `.em` empty-state pattern used throughout the legacy app
// (e.g. public/legacy-app.js:1552-1553).
export function EmptyState({ icon, children }) {
  return (
    <div className="em">
      {icon && <div className="big">{icon}</div>}
      <p>{children}</p>
    </div>
  );
}
