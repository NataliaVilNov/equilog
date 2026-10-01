// The "🔒 Acceso limitado" block, extracted from PermissionRoute.jsx so it can also be
// rendered mid-component (e.g. after a horse-relatedness check that needs its other hooks —
// useStableData, usePermissions — to run first, which a route-wrapper's early <Outlet/>
// return can't accommodate).
export function AccessLimited({ message }) {
  return (
    <div className="view">
      <div className="vh">
        <h1>Acceso limitado</h1>
      </div>
      <div className="em">
        <div className="big">🔒</div>
        <p>{message || "No tienes acceso a la información de este caballo. Pídele a un administrador que te comparta el acceso."}</p>
      </div>
    </div>
  );
}
