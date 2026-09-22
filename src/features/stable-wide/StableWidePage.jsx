import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs } from "../../components/Tabs.jsx";
import { Fab } from "../../components/layout/Fab.jsx";
import { StableTaskList } from "./StableTaskList.jsx";
import { StableExpenseList } from "./StableExpenseList.jsx";

const TABS = [
  { key: "tareas", label: "Tareas recurrentes" },
  { key: "gastos", label: "Gastos cuadra" },
];

// Ports rCuadra (public/legacy-app.js:2213-2279). The FAB matches render()'s
// `canPerm('stable') && nm==="cuadra"` fab block (public/legacy-app.js ~1532-1533) —
// implicit here since /cuadra is already gated by PermissionRoute("stable").
export function StableWidePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "tareas";

  function handleTabChange(next) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey" style={{ color: "var(--mo)" }}>
            EquiLog
          </span>
          <h1>Cuadra</h1>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
      {tab === "tareas" ? <StableTaskList /> : <StableExpenseList />}
      <Fab onClick={() => navigate(tab === "tareas" ? "/cuadra/tasks/new" : "/cuadra/expenses/new")} />
    </div>
  );
}
