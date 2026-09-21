import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { AuthScreen } from "../features/auth/AuthScreen.jsx";
import { StableListScreen } from "../features/stables/StableListScreen.jsx";

// Placeholder — replaced once Phase 4 (home dashboard) exists. Keeping it inline here
// means this routing skeleton is buildable and testable on its own before that exists.
function HomePlaceholder() {
  return <p>Home — under construction</p>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/stables" element={<StableListScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
