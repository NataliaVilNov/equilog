// Ports the #fab floating action button (index.html:131). Unlike the legacy version,
// which centrally decides visibility from the current view name inside render(), each
// page mounts this itself when it wants a FAB — a natural fit for React's composition
// model now that routing (not a single render() switch) owns which page is showing.
export function Fab({ onClick, label = "+" }) {
  return (
    <button className="fab" onClick={onClick}>
      {label}
    </button>
  );
}
