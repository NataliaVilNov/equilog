import { useMemo, useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";

export const WEEKDAYS = [
  { id: 1, label: "Lunes", short: "L" },
  { id: 2, label: "Martes", short: "M" },
  { id: 3, label: "Miércoles", short: "X" },
  { id: 4, label: "Jueves", short: "J" },
  { id: 5, label: "Viernes", short: "V" },
  { id: 6, label: "Sábado", short: "S" },
  { id: 7, label: "Domingo", short: "D" },
];

// Franjas de clase, agrupadas por día. Cada escuela tiene su propio horario (lunes a una
// hora, miércoles a otra), así que la franja lleva el día dentro en vez de haber una lista
// única compartida como en paddockSlots.
export function ClassSlotsConfig() {
  const { boardConfig, addClassSlot, deleteClassSlot } = useStableData();
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const slots = boardConfig.classSlots || [];
  const byDay = useMemo(
    () => WEEKDAYS.map((d) => ({ ...d, slots: slots.filter((s) => s.weekday === d.id) })).filter((d) => d.slots.length),
    [slots]
  );

  function submitSlot(e) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return;
    addClassSlot(weekday, start, end);
    setStart("");
    setEnd("");
  }

  function removeSlot(slot) {
    if (!window.confirm("¿Eliminar esta franja? Se borrarán las clases ya apuntadas en ella.")) return;
    deleteClassSlot(slot.id);
  }

  return (
    <section className="config-section">
      <div className="section-title">
        <div>
          <h2>Horarios de clase</h2>
          <p>Añade cada franja con su día. Un día sin franjas es un día sin clases.</p>
        </div>
      </div>
      <form className="fb" onSubmit={submitSlot} style={{ marginBottom: ".75rem" }}>
        <div className="fcol" style={{ maxWidth: "8rem" }}>
          <label>Día</label>
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fcol">
          <label>Inicio</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="fcol">
          <label>Fin</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <button className="btn btg btsm" type="submit">
          + Horario
        </button>
      </form>
      {!slots.length ? (
        <p style={{ fontSize: ".82rem", opacity: 0.7 }}>Todavía no hay horarios configurados.</p>
      ) : (
        byDay.map((d) => (
          <div key={d.id} style={{ marginBottom: ".5rem" }}>
            <div className="section-title compact">
              <div>
                <h3>{d.label}</h3>
              </div>
            </div>
            <div className="slot-list editable">
              {d.slots.map((s) => (
                <span key={s.id}>
                  {s.start}–{s.end}
                  <button onClick={() => removeSlot(s)}>×</button>
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}