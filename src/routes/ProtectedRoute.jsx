import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../contexts/StableSelectionContext.jsx";

// Requires a signed-in user with an active stable selected before rendering nested
// routes, replacing the legacy boot sequence in src/firebase.js's onAuthStateChanged
// (show auth screen -> stable selector -> app).
export function ProtectedRoute() {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const { activeStableId } = useContext(StableSelectionContext) || {};

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!activeStableId) return <Navigate to="/stables" replace />;

  return <Outlet />;
}
