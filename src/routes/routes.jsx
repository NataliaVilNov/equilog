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
import { AlertsPage } from "../features/alerts/AlertsPage.jsx";
import { AnswerSessionPage } from "../features/alerts/AnswerSessionPage.jsx";
import { HomePage } from "../features/home/HomePage.jsx";
import { TemplatesPage } from "../features/templates/TemplatesPage.jsx";
import { TemplateFormPage } from "../features/templates/TemplateFormPage.jsx";
import { TeamPage } from "../features/team/TeamPage.jsx";
import { TeamMemberFormPage } from "../features/team/TeamMemberFormPage.jsx";
import { TeamCalendarPage } from "../features/team/TeamCalendarPage.jsx";
import { MemberDayPage } from "../features/team/MemberDayPage.jsx";
import { TeamReportPage } from "../features/team/TeamReportPage.jsx";
import { StableWidePage } from "../features/stable-wide/StableWidePage.jsx";
import { StableTaskFormPage } from "../features/stable-wide/StableTaskFormPage.jsx";
import { StableExpenseFormPage } from "../features/stable-wide/StableExpenseFormPage.jsx";
import { BoardsPage } from "../features/boards/BoardsPage.jsx";
import { BoardCellPage } from "../features/boards/weekly/BoardCellPage.jsx";
import { SmartOrderPage } from "../features/smart-order/SmartOrderPage.jsx";
import { StatsPage } from "../features/stats/StatsPage.jsx";
import { TrainingReportPage } from "../features/reports/TrainingReportPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/stables" element={<StableListScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
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
        <Route element={<PermissionRoute requires="reports" />}>
          <Route path="/horses/:hid/report" element={<TrainingReportPage />} />
        </Route>
        <Route path="/day" element={<DayBoardPage />} />
        <Route element={<PermissionRoute requires="tasks" />}>
          <Route path="/tasks/new" element={<TaskFormPage />} />
          <Route path="/tasks/:tid/edit" element={<TaskFormPage />} />
        </Route>
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/alerts/:aid/answer" element={<AnswerSessionPage />} />
        <Route path="/team/:mid/day" element={<MemberDayPage />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/cell/:hid/:date" element={<BoardCellPage />} />
        <Route element={<PermissionRoute requires={["tasks", "health", "expenses"]} />}>
          <Route path="/smart-order" element={<SmartOrderPage />} />
        </Route>
        <Route element={<PermissionRoute requires="stats" />}>
          <Route path="/stats" element={<StatsPage />} />
        </Route>
        <Route element={<PermissionRoute requires="team" />}>
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateFormPage />} />
          <Route path="/templates/:tplid/edit" element={<TemplateFormPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/team/new" element={<TeamMemberFormPage />} />
          <Route path="/team/:mid/edit" element={<TeamMemberFormPage />} />
          <Route path="/team/calendar" element={<TeamCalendarPage />} />
          <Route path="/team/report" element={<TeamReportPage />} />
        </Route>
        <Route element={<PermissionRoute requires="stable" />}>
          <Route path="/cuadra" element={<StableWidePage />} />
          <Route path="/cuadra/tasks/new" element={<StableTaskFormPage />} />
          <Route path="/cuadra/tasks/:eid/edit" element={<StableTaskFormPage />} />
          <Route path="/cuadra/expenses/new" element={<StableExpenseFormPage />} />
          <Route path="/cuadra/expenses/:eid/edit" element={<StableExpenseFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
