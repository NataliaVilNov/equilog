import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useTaskOccurrences } from "../../hooks/useTaskOccurrences.js";
import { td, fDL, addD } from "../../lib/date.js";
import { TaskCard } from "../tasks/TaskCard.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

// Ports rMD (public/legacy-app.js:3421-3442). No permission gate — matches legacy exactly
// (rMD has no requirePermissionView call).
export function MemberDayPage() {
  const { mid } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stableId, team, tasks } = useStableData();
  const navigate = useNavigate();

  const ds = searchParams.get("d") || td();
  const member = team.find((x) => x.id === mid);

  const dayOccurrences = useTaskOccurrences(stableId, tasks, ds);

  if (!member) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  const memberTasks = dayOccurrences
    .filter((t) => t.assignedTo === mid)
    .sort((a, b) => ((a.time || "99:99") > (b.time || "99:99") ? 1 : -1));
  const dn = memberTasks.filter((t) => t.status === "done").length;
  const pct = memberTasks.length ? Math.round((dn / memberTasks.length) * 100) : 0;
  const prev = addD(ds, -1);
  const next = addD(ds, 1);

  function setDate(nextDate) {
    const params = new URLSearchParams(searchParams);
    params.set("d", nextDate);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/team")}>
          ←
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flex: 1, margin: "0 .4rem" }}>
          <div className="avsm">{member.photo ? <img src={member.photo} alt="" /> : member.emoji || "👤"}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: ".93rem" }}>{member.name}</div>
            <div style={{ fontSize: ".7rem", color: "var(--gr)" }}>{member.role || ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".3rem" }}>
          <button className="ib" onClick={() => setDate(prev)}>
            ‹
          </button>
          <button className="ib" onClick={() => setDate(next)}>
            ›
          </button>
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: ".84rem", color: "var(--gr)", marginBottom: ".7rem" }}>
        {ds === td() ? "Hoy" : fDL(ds)}
      </p>
      <div className="dp">
        <div className="pll">
          <span>
            {dn}/{memberTasks.length} completadas
          </span>
          <span>{pct}%</span>
        </div>
        <div className="bw">
          <div className="bf" style={{ width: pct + "%" }}></div>
        </div>
      </div>
      {!memberTasks.length ? (
        <EmptyState>Sin tareas asignadas.</EmptyState>
      ) : (
        memberTasks.map((t) => <TaskCard key={t.id} task={t} />)
      )}
    </div>
  );
}
