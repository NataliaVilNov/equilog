import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { PermissionRoute } from "./PermissionRoute.jsx";
import { AuthScreen } from "../features/auth/AuthScreen.jsx";
import { StableListScreen } from "../features/stables/StableListScreen.jsx";
import { HorseListPage } from "../features/horses/HorseListPage.jsx";
import { HorseFormPage } from "../features/horses/HorseFormPage.jsx";
import { HorseDetailPage } from "../features/horses/detail/HorseDetailPage.jsx";
import { TrainingFormPage } from "../features/trainings/TrainingFormPage.jsx";
import { HealthFormPage } from "../features/health/HealthFormPage.jsx";
import { ExpenseFormPage } from "../features/expenses/ExpenseFormPage.jsx";
import { ExpenseSettlementPage } from "../features/expenses/ExpenseSettlementPage.jsx";
import { DayBoardPage } from "../features/tasks/DayBoardPage.jsx";
import { TaskFormPage } from "../features/tasks/TaskFormPage.jsx";

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
        <Route path="/horses" element={<HorseListPage />} />
        <Route path="/horses/:hid" element={<HorseDetailPage />} />
        <Route element={<PermissionRoute requires="horses" />}>
          <Route path="/horses/new" element={<HorseFormPage />} />
          <Route path="/horses/:hid/edit" element={<HorseFormPage />} />
        </Route>
        <Route element={<PermissionRoute requires="trainings" />}>
          <Route path="/horses/:hid/trainings/new" element={<TrainingFormPage />} />
        </Route>
        <Route element={<PermissionRoute requires="health" />}>
          <Route path="/horses/:hid/health/new" element={<HealthFormPage />} />
          <Route path="/horses/:hid/health/:eid/edit" element={<HealthFormPage />} />
        </Route>
        <Route element={<PermissionRoute requires="expenses" />}>
          <Route path="/horses/:hid/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/horses/:hid/expenses/:eid/edit" element={<ExpenseFormPage />} />
          <Route path="/horses/:hid/expenses/settlement" element={<ExpenseSettlementPage />} />
        </Route>
        <Route path="/day" element={<DayBoardPage />} />
        <Route element={<PermissionRoute requires="tasks" />}>
          <Route path="/tasks/new" element={<TaskFormPage />} />
          <Route path="/tasks/:tid/edit" element={<TaskFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
