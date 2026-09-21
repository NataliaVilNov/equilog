import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

// Placeholders — replaced by the real screens as they're built (auth: step 17,
// stable list: step 18, home: Phase 4). Keeping them inline here means this routing
// skeleton is buildable and testable on its own before those features exist.
function AuthScreenPlaceholder() {
  return <p>Auth screen — under construction</p>;
}
function StableListPlaceholder() {
  return <p>Stable list — under construction</p>;
}
function HomePlaceholder() {
  return <p>Home — under construction</p>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthScreenPlaceholder />} />
      <Route path="/stables" element={<StableListPlaceholder />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
