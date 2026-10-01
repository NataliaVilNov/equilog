import { useNavigate } from "react-router-dom";
import { Fab } from "../../components/layout/Fab.jsx";
import { StableExpenseList } from "./StableExpenseList.jsx";

// Ports rCuadra (public/legacy-app.js:2213-2279). Recurring stable-wide tasks moved into the
// unified tasks collection/UI (see docs/components/tasks.md) — this page now only covers
// stable-wide expenses. The FAB matches render()'s `canPerm('stable') && nm==="cuadra"` fab
// block (public/legacy-app.js ~1532-1533) — implicit here since /cuadra is already gated by
// PermissionRoute("stable").
export function StableWidePage() {
  const navigate = useNavigate();

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
      <StableExpenseList />
      <Fab onClick={() => navigate("/cuadra/expenses/new")} />
    </div>
  );
}
