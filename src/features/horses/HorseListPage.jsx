import { useMemo, useState } from "react";
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
// ported. See docs/components/horses.md. The reorder mode below is new — not a legacy
// port — added so this shared order (also used by the weekly board's row order) is
// actually settable somewhere; plain up/down buttons, no drag-and-drop, matching how the
// rest of this app avoids introducing new drag-and-drop interactions.
export function HorseListPage() {
  const { horses, trainings, reorderHorses } = useStableData();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [reordering, setReordering] = useState(false);

  const sorted = useMemo(() => sortHorsesByOrder(horses), [horses]);
  const filtered = useMemo(
    () => sorted.filter((h) => h.name.toLowerCase().includes(query.toLowerCase())),
    [sorted, query]
  );

  function handleSearchChange(value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }

  function moveHorse(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = sorted.slice();
    [next[index], next[target]] = [next[target], next[index]];
    reorderHorses(next.map((h) => h.id));
  }

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">EquiLog</span>
          <h1>Caballos</h1>
        </div>
        {can("horses") && horses.length > 1 && (
          <button className="btn btg btsm vhr" onClick={() => setReordering((r) => !r)}>
            {reordering ? "Listo" : "Reordenar"}
          </button>
        )}
      </div>
      {reordering ? (
        <div className="config-list">
          {sorted.map((h, i) => (
            <div className="config-row" key={h.id}>
              <span className="config-code" style={{ background: "var(--vl)", color: "var(--vd)", overflow: "hidden" }}>
                {h.photo ? (
                  <img src={h.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "🐴"
                )}
              </span>
              <div>
                <b>{h.name}</b>
              </div>
              <div style={{ display: "flex", gap: ".25rem", flexShrink: 0 }}>
                <button className="ib" onClick={() => moveHorse(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button className="ib" onClick={() => moveHorse(i, 1)} disabled={i === sorted.length - 1}>
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
