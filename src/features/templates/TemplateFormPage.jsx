import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { AK, activityById } from "../../lib/constants.js";

// Ports rETpl/addTT/saveTpl (public/legacy-app.js:3503-3551). The in-progress task list
// held in local component state replaces legacy's V._tt view-state field.
export function TemplateFormPage() {
  const { tplid } = useParams();
  const { horses, team, taskTemplates, addTemplate, updateTemplate, deleteTemplate } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const editing = !!tplid;
  const tpl = editing ? taskTemplates.find((t) => t.id === tplid) : null;

  const [name, setName] = useState(tpl ? tpl.name : "");
  const [taskList, setTaskList] = useState(tpl ? [...tpl.tasks] : []);

  const [newHid, setNewHid] = useState("");
  const [newActivity, setNewActivity] = useState(AK[0].id);
  const [newPid, setNewPid] = useState("");
  const [newDur, setNewDur] = useState(30);

  if (editing && !tpl) {
    return (
      <div className="view">
        <p>No encontrada.</p>
      </div>
    );
  }

  function handleAddRow() {
    if (!newHid) {
      showToast("Selecciona un caballo");
      return;
    }
    setTaskList((prev) => [
      ...prev,
      { horseId: newHid, activity: newActivity, assignedTo: newPid || null, dur: Number(newDur) || 30 },
    ]);
  }

  function handleRemoveRow(i) {
    setTaskList((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Nombre obligatorio");
      return;
    }
    if (!taskList.length) {
      showToast("Añade al menos una tarea");
      return;
    }
    if (editing) updateTemplate({ id: tplid, name: trimmedName, tasks: taskList });
    else addTemplate({ id: uid(), name: trimmedName, tasks: taskList });
    showToast("Plantilla guardada");
    navigate("/templates");
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTemplate(tplid);
    navigate("/templates");
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/templates")}>
          ←
        </button>
        <h1>{editing ? "Editar" : "Nueva"} plantilla</h1>
      </div>
      <div className="f">
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Lunes habitual" />
      </div>
      <h2 style={{ fontSize: ".93rem", marginBottom: ".5rem" }}>Tareas</h2>
      <div>
        {taskList.length ? (
          taskList.map((t, i) => {
            const a = activityById(t.activity);
            const h = horses.find((x) => x.id === t.horseId);
            const m = team.find((x) => x.id === t.assignedTo);
            return (
              <div className="tkc" style={{ cursor: "default" }} key={i}>
                <div className="tkb">
                  <div className="tkt">
                    {a.i} {a.l} — {h ? h.name : "?"}
                  </div>
                  {m ? (
                    <span className="tka">
                      {m.emoji || "👤"} {m.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: ".73rem", color: "var(--gr)" }}>Sin asignar</span>
                  )}
                </div>
                <button className="db" onClick={() => handleRemoveRow(i)}>
                  ✕
                </button>
              </div>
            );
          })
        ) : (
          <p style={{ fontSize: ".78rem", color: "var(--gr)", marginBottom: ".7rem" }}>Sin tareas.</p>
        )}
      </div>
      <div className="card" style={{ borderStyle: "dashed", padding: ".8rem" }}>
        <div className="r2">
          <div className="f">
            <label>Caballo</label>
            <select value={newHid} onChange={(e) => setNewHid(e.target.value)}>
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
            <select value={newActivity} onChange={(e) => setNewActivity(e.target.value)}>
              {AK.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.i} {a.l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="r2">
          <div className="f">
            <label>Persona</label>
            <select value={newPid} onChange={(e) => setNewPid(e.target.value)}>
              <option value="">Sin asignar</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji || "👤"} {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Min.</label>
            <input type="number" min="5" value={newDur} onChange={(e) => setNewDur(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn btg btbl" onClick={handleAddRow}>
          + Añadir
        </button>
      </div>
      <div style={{ display: "grid", gap: ".42rem", marginTop: ".5rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          Guardar plantilla
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
