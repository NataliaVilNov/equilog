import { Outlet } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions.js";

// Ports requirePermissionView (public/legacy-app.js:676-679): render an inline
// "access limited" message instead of the route's content when the permission is missing.
// `requires` can be a single key or an array of keys — an array uses any-of semantics
// (canPerm('tasks')||canPerm('health')||canPerm('expenses'), public/legacy-app.js:3162,
// the gate rSmartOrder uses since it's reachable with any one of three permissions).
export function PermissionRoute({ requires, message }) {
  const { can } = usePermissions();
  const allowed = Array.isArray(requires) ? requires.some((key) => can(key)) : can(requires);

  if (!allowed) {
    return (
      <div className="view">
        <div className="vh">
          <h1>Acceso limitado</h1>
        </div>
        <div className="em">
          <div className="big">🔒</div>
          <p>
            {message ||
              "No tienes permiso para acceder a esta sección. El administrador puede modificar tus permisos desde Equipo."}
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
