import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";
import { AK } from "../../lib/constants.js";

// Ports rNTask (public/legacy-app.js:3244-3277). The route-level PermissionRoute("tasks")
// replaces requirePermissionView.
export function TaskFormPage() {
  const { tid } = useParams();
  const [searchParams] = useSearchParams();
  const { horses, team, tasks, addTask, updateTask, deleteTask } = useStableData();
  const { isAdmin, can, myTeamMember } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const editing = !!tid;
  const task = editing ? tasks.find((t) => t.id === tid) : null;

  const [hid, setHid] = useState(task ? task.hid : "");
  const [activity, setActivity] = useState(task ? task.activity : "monta");
  const [date, setDate] = useState(task ? task.date : searchParams.get("d") || td());
  const [time, setTime] = useState(task && task.time ? task.time : "");
  const [dur, setDur] = useState(task ? task.dur : 30);
  const [pid, setPid] = useState(() => {
    if (isAdmin) return task ? task.pid || "" : "";
    return (task && task.pid) || (myTeamMember ? myTeamMember.id : "") || "";
  });
  const [notes, setNotes] = useState(task ? task.notes || "" : "");

  if (editing && !task) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  function handleBack() {
    navigate(`/day?d=${date}`);
  }

  function handleSubmit() {
    if (!hid) {
      showToast("Selecciona un caballo");
      return;
    }
    const id = editing ? tid : uid();
    const record = {
      id,
      createdBy: null,
      hid,
      activity,
      date,
      time: time || null,
      dur: Number(dur) || 30,
      pid: pid || null,
      notes: notes.trim(),
      status: editing ? task.status || "pending" : "pending",
    };
    if (editing) updateTask(record);
    else addTask(record);
    showToast(editing ? "Actualizada" : "Tarea añadida");
    navigate(`/day?d=${date}`);
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTask(tid);
    navigate(`/day?d=${date}`);
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>{editing ? "Editar" : "Nueva"} tarea</h1>
      </div>
      <div className="f">
        <label>Caballo *</label>
        <select value={hid} onChange={(e) => setHid(e.target.value)}>
          <option value="">Caballo...</option>
          {horses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>
      <div className="f">
        <label>Actividad</label>
        <div className="og og3">
          {AK.map((a) => (
            <div
              key={a.id}
              className={"oo" + (activity === a.id ? " active" : "")}
              onClick={() => setActivity(a.id)}
            >
              <span className="ic">{a.i}</span>
              {a.l}
            </div>
          ))}
        </div>
      </div>
      <div className="r2">
        <div className="f">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f">
          <label>Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label>Duración estimada</label>
        <div className="slrow">
          <input
            type="range"
            min="5"
            max="180"
            step="5"
            value={dur}
            onChange={(e) => setDur(Number(e.target.value))}
          />
          <span className="slv">{dur} min</span>
        </div>
      </div>
      <div className="f">
        <label>Persona responsable</label>
        {isAdmin ? (
          <div className="pch">
            <div className={"pc" + (!pid ? " active" : "")} onClick={() => setPid("")}>
              Sin asignar
            </div>
            {team.map((m) => (
              <div key={m.id} className={"pc" + (pid === m.id ? " active" : "")} onClick={() => setPid(m.id)}>
                {m.emoji || "👤"} {m.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: ".65rem", marginBottom: 0 }}>
            <div style={{ fontSize: ".82rem", color: "var(--gr)" }}>
              Asignada a: <b>{myTeamMember ? myTeamMember.name : "mi usuario"}</b>
            </div>
          </div>
        )}
      </div>
      <div className="f">
        <label>Notas</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles opcionales..." />
      </div>
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar" : "Añadir tarea"}
        </button>
        {editing && can("deleteItems") && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar tarea
          </button>
        )}
      </div>
    </div>
  );
}
