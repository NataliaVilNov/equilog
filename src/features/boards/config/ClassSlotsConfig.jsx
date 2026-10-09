import { useMemo, useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";
import { teacherTone, slotLabel } from "../school/schoolHelpers.js";
import { boardToneClass } from "../boardHelpers.js";

export const WEEKDAYS = [
  { id: 1, label: "Lunes", short: "L" },
  { id: 2, label: "Martes", short: "M" },
  { id: 3, label: "Miércoles", short: "X" },
  { id: 4, label: "Jueves", short: "J" },
  { id: 5, label: "Viernes", short: "V" },
  { id: 6, label: "Sábado", short: "S" },
  { id: 7, label: "Domingo", short: "D" },
];

// Franjas de clase, agrupadas por dia. Cada escuela tiene su propio horario (lunes a una
// hora, miercoles a otra), asi que la franja lleva el dia dentro en vez de haber una lista
// unica compartida como en paddockSlots. Varias franjas pueden coincidir en dia y hora:
// son grupos simultaneos con profesores distintos.
export function ClassSlotsConfig() {
  const { boardConfig, team, addClassSlot, updateClassSlot, deleteClassSlot } = useStableData();
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [groupName, setGroupName] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const slots = boardConfig.classSlots || [];
  const byDay = useMemo(
    () =>
      WEEKDAYS.map((d) => ({
        ...d,
        slots: slots.filter((s) => s.weekday === d.id).sort((a, b) => a.start.localeCompare(b.start)),
      })).filter((d) => d.slots.length),
    [slots]
  );

  function submitSlot(e) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return;
    addClassSlot(weekday, start, end, groupName.trim(), teacherId || null);
    setStart("");
    setEnd("");
    setGroupName("");
    setTeacherId("");
  }

  function removeSlot(slot) {
    if (!window.confirm("¿Eliminar esta clase? Se borrarán las sesiones ya apuntadas en ella.")) return;
    deleteClassSlot(slot.id);
  }

  return (
    <section className="config-section">
      <div className="section-title">
        <div>
          <h2>Clases y horarios</h2>
          <p>
            Cada clase tiene su día, su hora y su profesor. Puedes crear varias a la misma hora si son grupos
            simultáneos.
          </p>
        </div>
      </div>

      <form onSubmit={submitSlot} style={{ marginBottom: ".75rem" }}>
        <div className="fb">
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
        </div>
        <div className="fb">
          <div className="fcol">
            <label>Grupo</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ponis" />
          </div>
          <div className="fcol">
            <label>Profesor</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btg btsm" type="submit">
            + Clase
          </button>
        </div>
      </form>

      {!slots.length ? (
        <p style={{ fontSize: ".82rem", opacity: 0.7 }}>Todavía no hay clases configuradas.</p>
      ) : (
        byDay.map((d) => (
          <div key={d.id} style={{ marginBottom: ".6rem" }}>
            <div className="section-title compact">
              <div>
                <h3>{d.label}</h3>
              </div>
            </div>
            <div className="config-list">
              {d.slots.map((s) => (
                <div className="config-row" key={s.id}>
                  <span className={"config-code " + boardToneClass(teacherTone(team, s.teacherId))}>
                    {s.start.slice(0, 2)}
                  </span>
                  <div>
                    <b>
                      {s.start}–{s.end}
                    </b>
                    <small>{slotLabel(s, team) || "Sin grupo ni profesor"}</small>
                  </div>
                  <input
                    value={s.groupName || ""}
                    placeholder="Grupo"
                    style={{ flexShrink: 0, maxWidth: "7rem" }}
                    onChange={(e) => updateClassSlot(s.id, { groupName: e.target.value, teacherId: s.teacherId })}
                  />
                  <select
                    value={s.teacherId || ""}
                    style={{ flexShrink: 0, maxWidth: "8rem" }}
                    onChange={(e) => updateClassSlot(s.id, { groupName: s.groupName, teacherId: e.target.value || null })}
                  >
                    <option value="">— Profesor —</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button className="db" onClick={() => removeSlot(s)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}