import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { FK } from "../../lib/constants.js";

const ICONS = ["📌", "🧹", "🚿", "🧺", "💡", "🔧", "🗑️", "🌿", "🪣", "🛒", "🧼", "🏠", "🔒", "🌀"];

// Ports rNCT (public/legacy-app.js:2286-2311).
export function StableTaskFormPage() {
  const { eid } = useParams();
  const { ctasks, team, addStableTask, updateStableTask, deleteStableTask } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const editing = !!eid;
  const task = editing ? ctasks.find((t) => t.id === eid) : null;

  const [name, setName] = useState(task ? task.name || "" : "");
  const [icon, setIcon] = useState(task ? task.icon : "📌");
  const [freq, setFreq] = useState(task ? task.freq : "diaria");
  const [pid, setPid] = useState(task ? task.pid || "" : "");
  const [notes, setNotes] = useState(task ? task.notes || "" : "");

  function handleBack() {
    navigate("/cuadra?tab=tareas");
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Nombre obligatorio");
      return;
    }
    const id = editing ? eid : uid();
    const record = {
      id,
      name: trimmedName,
      icon: icon || "📌",
      freq: freq || "diaria",
      pid: pid || null,
      notes: notes.trim(),
      ld: editing && task ? task.ld : null,
    };
    if (editing) updateStableTask(record);
    else addStableTask(record);
    showToast(editing ? "Actualizada" : "Tarea añadida");
    handleBack();
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteStableTask(eid);
    handleBack();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>{editing ? "Editar" : "Nueva"} tarea de cuadra</h1>
      </div>
      <div className="f">
        <label>Nombre *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Limpiar telarañas, Lavadora..."
        />
      </div>
      <div className="f">
        <label>Icono</label>
        <div className="pch">
          {ICONS.map((ic) => (
            <div
              key={ic}
              className={"pc" + (icon === ic ? " active" : "")}
              onClick={() => setIcon(ic)}
              style={{ fontSize: "1.2rem", padding: ".3rem .5rem" }}
            >
              {ic}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Frecuencia</label>
        <div className="og og4">
          {FK.map((f) => (
            <div key={f.id} className={"oo" + (freq === f.id ? " active" : "")} onClick={() => setFreq(f.id)}>
              <span className="ic">{f.i}</span>
              {f.l}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Persona responsable</label>
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
      </div>
      <div className="f">
        <label>Notas</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles opcionales..." />
      </div>
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar cambios" : "Añadir tarea"}
        </button>
        {editing && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
