import { useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";

// Ports addPaddock/deletePaddock/addPaddockSlot/deletePaddockSlot
// (public/legacy-app.js:1465-1468). The paddock-slot form takes one start/end pair per
// submit (a real inline form) instead of legacy's promptSlots, which parsed several at once
// from one comma-separated string — the same prompt()-to-form adaptation used elsewhere in
// this migration. The shared slot list stays sorted by start time either way (the
// addPaddockSlot mutator sorts on insert).
export function PaddocksConfig() {
  const { boardConfig, addPaddock, deletePaddock, addPaddockSlot, deletePaddockSlot } = useStableData();
  const [name, setName] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  function submitPaddock(e) {
    e.preventDefault();
    const value = name.trim() || `Paddock ${boardConfig.paddocks.length + 1}`;
    addPaddock(value);
    setName("");
  }
  function removePaddock(id) {
    if (!window.confirm("¿Eliminar este paddock?")) return;
    deletePaddock(id);
  }
  function submitSlot(e) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(slotStart) || !/^\d{2}:\d{2}$/.test(slotEnd)) return;
    addPaddockSlot(slotStart, slotEnd);
    setSlotStart("");
    setSlotEnd("");
  }
  function removeSlot(id) {
    if (!window.confirm("¿Eliminar esta franja horaria?")) return;
    deletePaddockSlot(id);
  }

  return (
    <section className="config-section">
      <div className="section-title">
        <div>
          <h2>Paddocks</h2>
          <p>Elige nombres, número de espacios y franjas del día.</p>
        </div>
      </div>
      <form className="fb" onSubmit={submitPaddock} style={{ marginBottom: ".75rem" }}>
        <div className="fcol">
          <label>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Paddock ${boardConfig.paddocks.length + 1}`}
          />
        </div>
        <button className="btn btsm" type="submit">
          + Paddock
        </button>
      </form>
      <div className="config-list">
        {boardConfig.paddocks.map((p) => (
          <div className="config-row" key={p.id}>
            <span className="config-code ba-amber">P</span>
            <div>
              <b>{p.name}</b>
              <small>Capacidad {p.capacity || 1}</small>
            </div>
            <button className="db" onClick={() => removePaddock(p.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="section-title compact">
        <div>
          <h3>Franjas horarias</h3>
        </div>
      </div>
      <form className="fb" onSubmit={submitSlot} style={{ marginBottom: ".5rem" }}>
        <div className="fcol">
          <label>Inicio</label>
          <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
        </div>
        <div className="fcol">
          <label>Fin</label>
          <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
        </div>
        <button className="btn btg btsm" type="submit">
          + Horario
        </button>
      </form>
      <div className="slot-list editable">
        {boardConfig.paddockSlots.map((s) => (
          <span key={s.id}>
            {s.start}–{s.end}
            <button onClick={() => removeSlot(s.id)}>×</button>
          </span>
        ))}
      </div>
    </section>
  );
}
