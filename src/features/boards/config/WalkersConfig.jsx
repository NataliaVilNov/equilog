import { useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";
import { uid } from "../../../lib/id.js";
import { SlotListEditor } from "./SlotListEditor.jsx";

const EMPTY_FORM = { name: "", capacity: 4, slots: [] };

// Ports addWalker/editWalker/deleteWalker (public/legacy-app.js:1462-1464), replacing
// legacy's chained prompt() calls (name, then capacity, then a comma-separated slot list
// via promptSlots) with a real inline form — see SlotListEditor.jsx for how this also
// structurally fixes the slot-id-regeneration bug documented in docs/components/boards.md.
export function WalkersConfig() {
  const { boardConfig, addWalker, updateWalker, deleteWalker } = useStableData();
  const [editingId, setEditingId] = useState(null); // null = closed, "new" = adding
  const [form, setForm] = useState(EMPTY_FORM);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }
  function startEdit(w) {
    setForm({ name: w.name, capacity: w.capacity, slots: w.slots });
    setEditingId(w.id);
  }
  function cancel() {
    setEditingId(null);
  }
  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const capacity = Math.max(1, Math.min(20, Number(form.capacity) || 4));
    const slots = form.slots
      .filter((s) => /^\d{2}:\d{2}$/.test(s.start) && /^\d{2}:\d{2}$/.test(s.end))
      .map((s) => (s.id ? s : { ...s, id: uid() }));
    if (editingId === "new") addWalker(name, capacity, slots);
    else updateWalker(editingId, { name, capacity, slots });
    setEditingId(null);
  }
  function remove(id) {
    if (!window.confirm("¿Eliminar este caminador?")) return;
    deleteWalker(id);
  }

  return (
    <section className="config-section">
      <div className="section-title">
        <div>
          <h2>Caminadores</h2>
          <p>Cada caminador puede tener sus propios huecos y horarios.</p>
        </div>
        {editingId === null && (
          <button className="btn btsm" onClick={startAdd}>
            + Añadir
          </button>
        )}
      </div>

      {editingId !== null && (
        <form className="card" style={{ padding: ".85rem", marginBottom: ".75rem" }} onSubmit={submit}>
          <div className="fcol">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Caminador principal"
            />
          </div>
          <div className="fcol">
            <label>Número de huecos</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>
          <label>Horarios</label>
          <SlotListEditor slots={form.slots} onChange={(slots) => setForm({ ...form, slots })} />
          <div className="r2" style={{ marginTop: ".6rem" }}>
            <button type="button" className="btn btg btsm" onClick={cancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btsm btbl">
              Guardar
            </button>
          </div>
        </form>
      )}

      {boardConfig.walkers.length ? (
        boardConfig.walkers.map((w) => (
          <div className="config-card" key={w.id}>
            <div className="config-card-head">
              <div>
                <b>{w.name}</b>
                <small>{w.capacity} huecos</small>
              </div>
              <div>
                <button className="btn btg btsm" onClick={() => startEdit(w)}>
                  Editar
                </button>
                <button className="db" onClick={() => remove(w.id)}>
                  ×
                </button>
              </div>
            </div>
            <div className="slot-list">
              {w.slots.length ? (
                w.slots.map((s) => (
                  <span key={s.id}>
                    {s.start}–{s.end}
                  </span>
                ))
              ) : (
                <small>Sin horarios</small>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-soft">
          <span>C</span>
          <div>
            <b>Sin caminadores</b>
            <p>Añade el primero cuando quieras.</p>
          </div>
        </div>
      )}
    </section>
  );
}
