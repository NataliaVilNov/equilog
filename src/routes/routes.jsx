import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { AuthScreen } from "../features/auth/AuthScreen.jsx";

// Placeholders — replaced by the real screens as they're built (stable list: step 18,
// home: Phase 4). Keeping them inline here means this routing skeleton is buildable
// and testable on its own before those features exist.
function StableListPlaceholder() {
  return <p>Stable list — under construction</p>;
}
function HomePlaceholder() {
  return <p>Home — under construction</p>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/stables" element={<StableListPlaceholder />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
