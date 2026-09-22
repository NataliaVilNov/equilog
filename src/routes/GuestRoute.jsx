import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";

// The counterpart to ProtectedRoute: redirects an already-authenticated user away from
// guest-only routes (the login/register screen). Replaces the legacy boot sequence in
// src/firebase.js's onAuthStateChanged, which showed the stable selector or app instead of
// the auth screen once a user was signed in — nothing else in the React port sends a
// signed-in user away from /login, so without this a successful login just leaves the user
// stranded on the login screen. /home redirects on to /stables itself (via ProtectedRoute)
// if there's no active stable yet.
export function GuestRoute() {
  const { user, loading } = useContext(AuthContext) || {};

  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;

  return <Outlet />;
}
