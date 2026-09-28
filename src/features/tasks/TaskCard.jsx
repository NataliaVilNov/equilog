import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { activityById } from "../../lib/constants.js";
import { taskStatusIcon, taskStatusLabel, taskNeedsReturn } from "./taskHelpers.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useStableData } from "../../hooks/useStableData.js";

// Ports tcard (public/legacy-app.js:3205-3224). Also reused by HomePage (Phase 4c).
export function TaskCard({ task }) {
  const { horses, team, cycleTaskStatus, cycleOccurrenceStatus, setOccurrenceAssignee, deleteTask } = useStableData();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const horse = horses.find((h) => h.id === task.horseId);
  const a = activityById(task.activity);
  const member = task.assignedTo ? team.find((x) => x.id === task.assignedTo) : null;
  const icon = taskStatusIcon(task);
  const label = taskStatusLabel(task);
  const dbl = taskNeedsReturn(task.activity);
  // Reassigning a single occurrence writes to the same doc/collection the new rules gate on
  // the `tasks` permission — keep the UI gate matching what the rules would allow.
  const canReassign = task.isRecurringOccurrence && can("tasks");

  function handleCycle() {
    if (task.isRecurringOccurrence) cycleOccurrenceStatus(task);
    else cycleTaskStatus(task.id);
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTask(task.id);
  }

  function handleReassign(memberId) {
    setOccurrenceAssignee(task, memberId);
    setPickerOpen(false);
  }

  return (
    <div className={"tkc" + (task.status === "done" ? " done" : "")}>
      <button
        className={"ck " + task.status}
        onClick={handleCycle}
        title={dbl ? "Pendiente → llevado → recogido" : "Pendiente → hecho"}
        style={icon === "✓✓" ? { fontSize: ".68rem" } : undefined}
      >
        {icon}
      </button>
      <div className="tkb">
        <div className="tkt">
          {a.i} {a.l} — {horse ? horse.name : "Tarea general"}
        </div>
        <div className="tkm">
          {task.dur ? task.dur + "min" : ""}
          {task.notes ? " · " + task.notes : ""}
        </div>
        {canReassign ? (
          <button type="button" className="tka" onClick={() => setPickerOpen((o) => !o)}>
            {member ? `${member.emoji || "👤"} ${member.name}` : "Sin asignar"}
          </button>
        ) : (
          member && (
            <span className="tka">
              {member.emoji || "👤"} {member.name}
            </span>
          )
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
        {task.recurrenceRule && (
          <span style={{ fontSize: ".7rem", color: "var(--gr)", marginLeft: ".3rem" }} title="Tarea recurrente">
            🔁
          </span>
        )}
        {pickerOpen && canReassign && (
          <div className="pch">
            <div className={"pc" + (!task.assignedTo ? " active" : "")} onClick={() => handleReassign(null)}>
              Sin asignar
            </div>
            {team.map((m) => (
              <div
                key={m.id}
                className={"pc" + (task.assignedTo === m.id ? " active" : "")}
                onClick={() => handleReassign(m.id)}
              >
                {m.emoji || "👤"} {m.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: ".25rem" }}>
        <button
          className="ib"
          style={{ width: "27px", height: "27px", fontSize: ".72rem" }}
          onClick={() => navigate(`/tasks/${task.id}/edit?d=${task.occurrenceDate || task.startDate}`)}
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
