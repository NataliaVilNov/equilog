import { useNavigate } from "react-router-dom";
import { activityById } from "../../lib/constants.js";
import { taskStatusIcon, taskStatusLabel, taskNeedsReturn } from "./taskHelpers.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useStableData } from "../../hooks/useStableData.js";

// Ports tcard (public/legacy-app.js:3205-3224). Also reused by HomePage (Phase 4c).
export function TaskCard({ task }) {
  const { horses, team, cycleTaskStatus, deleteTask } = useStableData();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const horse = horses.find((h) => h.id === task.hid);
  const a = activityById(task.activity);
  const member = task.pid ? team.find((x) => x.id === task.pid) : null;
  const icon = taskStatusIcon(task);
  const label = taskStatusLabel(task);
  const dbl = taskNeedsReturn(task.activity);

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTask(task.id);
  }

  return (
    <div className={"tkc" + (task.status === "done" ? " done" : "")}>
      <button
        className={"ck " + task.status}
        onClick={() => cycleTaskStatus(task.id)}
        title={dbl ? "Pendiente → llevado → recogido" : "Pendiente → hecho"}
        style={icon === "✓✓" ? { fontSize: ".68rem" } : undefined}
      >
        {icon}
      </button>
      <div className="tkb">
        <div className="tkt">
          {a.i} {a.l} — {horse ? horse.name : "?"}
        </div>
        <div className="tkm">
          {task.dur ? task.dur + "min" : ""}
          {task.notes ? " · " + task.notes : ""}
        </div>
        {member && (
          <span className="tka">
            {member.emoji || "👤"} {member.name}
          </span>
        )}
        <span
          style={{
            fontSize: ".68rem",
            color: task.status === "done" ? "var(--v)" : task.status === "inprogress" ? "var(--am)" : "var(--gr)",
            marginLeft: ".3rem",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        {task.time && (
          <span style={{ fontSize: ".7rem", color: "var(--gr)", marginLeft: ".3rem" }}>🕐 {task.time}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: ".25rem" }}>
        <button
          className="ib"
          style={{ width: "27px", height: "27px", fontSize: ".72rem" }}
          onClick={() => navigate(`/tasks/${task.id}/edit?d=${task.date}`)}
        >
          ✏️
        </button>
        {can("deleteItems") && (
          <button className="db" onClick={handleDelete}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
