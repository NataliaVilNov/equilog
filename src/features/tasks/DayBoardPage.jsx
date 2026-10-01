import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useTaskOccurrences } from "../../hooks/useTaskOccurrences.js";
import { td, addD, fD, fDL } from "../../lib/date.js";
import { TaskCard } from "./TaskCard.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { Fab } from "../../components/layout/Fab.jsx";

// Ports rDay (public/legacy-app.js:3127-3188), now also the merged home for stable-wide
// chores since the tasks/ctasks split ended (docs/components/tasks.md). "Orden inteligente"
// (Phase 7), "Plantilla" (Phase 4d, later in this same phase), "Informe equipo" and the
// per-member day view (both Phase 5) are forward-links to not-yet-built routes, same
// deferred-link pattern used elsewhere in this migration.
export function DayBoardPage() {
  const { stableId, tasks, team } = useStableData();
  const { can, myTeamMember } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const ds = searchParams.get("d") || td();
  const filter = searchParams.get("person") || "all";

  const tasksAll = useTaskOccurrences(stableId, tasks, ds)
    .slice()
    .sort((a, b) => ((a.time || "99:99") > (b.time || "99:99") ? 1 : -1));
  const filteredTasks =
    filter === "all"
      ? tasksAll
      : filter === "unassigned"
      ? tasksAll.filter((t) => !t.assignedTo)
      : tasksAll.filter((t) => t.assignedTo === filter);
  const done = filteredTasks.filter((t) => t.status === "done").length;
  const p = {
    total: filteredTasks.length,
    done,
    pct: filteredTasks.length ? Math.round((done / filteredTasks.length) * 100) : 0,
  };
  const isToday = ds === td();
  const prev = addD(ds, -1);
  const next = addD(ds, 1);
  const myMid = myTeamMember ? myTeamMember.id : null;
  const unCount = tasksAll.filter((t) => !t.assignedTo).length;

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params, { replace: true });
  }

  function renderGroup(title, list, mid) {
    if (!list.length) return null;
    const md = list.filter((t) => t.status === "done").length;
    return (
      <div key={title} style={{ marginBottom: "1rem" }}>
        <h2
          style={{ fontSize: ".93rem", marginBottom: ".5rem", cursor: mid ? "pointer" : undefined }}
          onClick={mid ? () => navigate(`/team/${mid}/day?d=${ds}`) : undefined}
        >
          {title}{" "}
          <span style={{ fontSize: ".72rem", color: "var(--gr)", fontWeight: 400 }}>
            {md}/{list.length}
          </span>
        </h2>
        {list.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    );
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => setParam("d", prev)}>
          ‹
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem" }}>{isToday ? "Hoy" : fDL(ds)}</h1>
          {!isToday && <p style={{ fontSize: ".72rem", color: "var(--gr)" }}>{fD(ds)}</p>}
        </div>
        <button className="ib" onClick={() => setParam("d", next)}>
          ›
        </button>
      </div>
      <div className="dp">
        <div className="pll">
          <span>
            {p.done}/{p.total} tareas{filter === "all" ? ` · ${tasksAll.length} total` : ""}
          </span>
          <span>{p.pct}%</span>
        </div>
        <div className="bw">
          <div className="bf" style={{ width: p.pct + "%" }}></div>
        </div>
      </div>
      <div className="fb" style={{ marginBottom: ".75rem" }}>
        <div className="fcol">
          <label>Filtrar por persona</label>
          <select value={filter} onChange={(e) => setParam("person", e.target.value)}>
            <option value="all">Todos ({tasksAll.length})</option>
            {myMid && (
              <option value={myMid}>
                Mis tareas{myTeamMember ? " · " + myTeamMember.name : ""} (
                {tasksAll.filter((t) => t.assignedTo === myMid).length})
              </option>
            )}
            {team
              .filter((m) => m.id !== myMid)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({tasksAll.filter((t) => t.assignedTo === m.id).length})
                </option>
              ))}
            <option value="unassigned">Sin asignar ({unCount})</option>
          </select>
        </div>
      </div>
      <div className="r2" style={{ marginBottom: ".55rem" }}>
        {(can("tasks") || can("health") || can("expenses")) && (
          <button className="btn bts btsm" onClick={() => navigate(`/smart-order?d=${ds}`)}>
            ⚡ Orden inteligente
          </button>
        )}
        <button className="btn btg btsm" onClick={() => navigate(`/templates?d=${ds}`)}>
          📋 Plantilla
        </button>
      </div>
      {can("team") && (
        <div style={{ marginBottom: ".9rem" }}>
          <button className="btn btg btsm btbl" onClick={() => navigate("/team/report")}>
            📊 Informe equipo
          </button>
        </div>
      )}

      {!filteredTasks.length ? (
        <EmptyState icon="📋">Sin tareas para este filtro.</EmptyState>
      ) : filter === "all" ? (
        <>
          {team.map((m) => renderGroup(`${m.emoji || "👤"} ${m.name}`, filteredTasks.filter((t) => t.assignedTo === m.id), m.id))}
          {renderGroup("Sin asignar", filteredTasks.filter((t) => !t.assignedTo), null)}
        </>
      ) : filter === "unassigned" ? (
        renderGroup("Sin asignar", filteredTasks, null)
      ) : (
        (() => {
          const m = team.find((x) => x.id === filter);
          return renderGroup(m ? `${m.emoji || "👤"} ${m.name}` : "Persona", filteredTasks, filter);
        })()
      )}

      {can("tasks") && <Fab onClick={() => navigate(`/tasks/new?d=${ds}`)} />}
    </div>
  );
}
