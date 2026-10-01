import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { resolveLandingRoute } from "../features/home/landingDestinations.js";

// The counterpart to ProtectedRoute: redirects an already-authenticated user away from
// guest-only routes (the login/register screen). Replaces the legacy boot sequence in
// src/firebase.js's onAuthStateChanged, which showed the stable selector or app instead of
// the auth screen once a user was signed in — nothing else in the React port sends a
// signed-in user away from /login, so without this a successful login just leaves the user
// stranded on the login screen. The resolved destination redirects on to /stables itself
// (via ProtectedRoute) if there's no active stable yet.
export function GuestRoute() {
  const { user, profile, loading } = useContext(AuthContext) || {};
  const { can } = usePermissions();

  if (loading) return null;
  if (user) return <Navigate to={resolveLandingRoute(profile && profile.landingRoute, { can })} replace />;

  return <Outlet />;
}
