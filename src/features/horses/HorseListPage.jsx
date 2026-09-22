import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { HorseSearchBar } from "./HorseSearchBar.jsx";
import { HorseListItem } from "./HorseListItem.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { Fab } from "../../components/layout/Fab.jsx";
import { sortHorsesByOrder } from "./horseOrder.js";

// Ports rList (public/legacy-app.js:1539-1574). The session-alerts/health-alerts banner
// is intentionally left out for now — it depends on the Alerts feature (Phase 4), not yet
// ported. See docs/components/horses.md.
export function HorseListPage() {
  const { horses, trainings } = useStableData();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const filtered = useMemo(
    () => sortHorsesByOrder(horses).filter((h) => h.name.toLowerCase().includes(query.toLowerCase())),
    [horses, query]
  );

  function handleSearchChange(value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">EquiLog</span>
          <h1>Caballos</h1>
        </div>
      </div>
      <HorseSearchBar value={query} onChange={handleSearchChange} />
      {!horses.length ? (
        <EmptyState icon="🐴">
          Sin caballos.
          <br />
          Pulsa <b>+</b> para añadir el primero.
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState>Sin resultados.</EmptyState>
      ) : (
        filtered.map((horse) => (
          <HorseListItem
            key={horse.id}
            horse={horse}
            trainingCount={trainings.filter((t) => t.hid === horse.id).length}
          />
        ))
      )}
      {can("horses") && <Fab onClick={() => navigate("/horses/new")} />}
    </div>
  );
}
