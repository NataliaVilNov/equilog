import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../contexts/StableSelectionContext.jsx";
import { useCollaborators } from "../contexts/CollaboratorsContext.jsx";

// Requires a signed-in user with an active stable selected before rendering nested
// routes, replacing the legacy boot sequence in src/firebase.js's onAuthStateChanged
// (show auth screen -> stable selector -> app). Pass requireStable={false} for a route
// that only needs a signed-in user, not an active stable yet (the /stables list itself).
//
// Un colaborador externo no es miembro de ninguna cuadra y nunca va a tener una activa, así
// que la lista de cuadras no le sirve de nada: se le manda a su propia pantalla. Se espera a
// que sus accesos hayan cargado antes de decidir, porque mientras la consulta está en vuelo
// la lista está vacía y sería indistinguible de no tener ninguno.
export function ProtectedRoute({ requireStable = true }) {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const { activeStableId } = useContext(StableSelectionContext) || {};
  const { myAccesses, myAccessesLoaded } = useCollaborators();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (requireStable && !activeStableId) {
    if (!myAccessesLoaded) return null;
    const hasAccess = (myAccesses || []).some((a) => a.status === "active");
    return <Navigate to={hasAccess ? "/colaborador" : "/stables"} replace />;
  }

  return <Outlet />;
}