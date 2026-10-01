import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../contexts/StableSelectionContext.jsx";

// Requires a signed-in user with an active stable selected before rendering nested
// routes, replacing the legacy boot sequence in src/firebase.js's onAuthStateChanged
// (show auth screen -> stable selector -> app). Pass requireStable={false} for a route
// that only needs a signed-in user, not an active stable yet (the /stables list itself).
export function ProtectedRoute({ requireStable = true }) {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const { activeStableId } = useContext(StableSelectionContext) || {};

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireStable && !activeStableId) return <Navigate to="/stables" replace />;

  return <Outlet />;
}
