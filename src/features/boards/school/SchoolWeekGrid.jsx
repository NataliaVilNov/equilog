import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { addD, fD, fDL, td } from "../../../lib/date.js";
import { classesOnDate, dayOffOn } from "../../../lib/classExceptions.js";
import { boardWeekDates, boardToneClass } from "../boardHelpers.js";
import { teacherTone, teacherName, slotLabel } from "./schoolHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Vista semanal de la escuela: una columna por dia, un recuadro por clase. Varias clases
// pueden coincidir en hora — son grupos simultaneos con profesores distintos — asi que la
// columna es una pila ordenada por hora, no una rejilla de franjas fijas. Al abrir una
// clase, su panel es editable: sustituye a la antigua pizarra diaria, que mostraba lo
// mismo un dia a la vez. El horario fijo (classSlots) se corrige con las excepciones
// puntuales de boardConfig.classExceptions, que se marcan tanto aqui como en la vista de mes.
export function SchoolWeekGrid({ week }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    horses,
    students,
    lessons,
    team,
    boardConfig,
    setLessonHorse,
    toggleLessonAbsent,
    addExtraLesson,
    removeLesson,
    toggleDayOff,
    toggleClassOff,
    moveClass,
  } = useStableData();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const [open, setOpen] = useState(null);
  // Destino que se va eligiendo al mover una clase; null mientras no se esta moviendo nada.
  const [moving, setMoving] = useState(null);

  const dates = boardWeekDates(week);
  const today = td();
  const slots = boardConfig.classSlots || [];
  const exceptions = boardConfig.classExceptions || [];
  const canEdit = can("stable");
  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);
  const teachers = useMemo(() => [...new Set(slots.map((s) => s.teacherId).filter(Boolean))], [slots]);

  function shiftWeek(n) {
    const params = new URLSearchParams(searchParams);
    params.set("week", addD(week, n * 7));
    navigate("/boards?" + params.toString());
  }

  // Las clases reales de un dia: el horario semanal corregido con las excepciones puntuales
  // (festivos, clases anuladas, clases traidas de otro dia).
  function entriesOfDay(date) {
    return classesOnDate(slots, exceptions, date);
  }

  // Alumnos de una clase: los fijos por horario mas los puntuales apuntados ese dia.
  function rosterFor(slot, date) {
    const dayLessons = lessons.filter((l) => l.date === date && l.slotId === slot.id);
    const fixed = activeStudents.filter((s) => (s.schedule || []).includes(slot.id));
    const extraIds = dayLessons.filter((l) => l.extra).map((l) => l.studentId);
    const extras = activeStudents.filter((s) => extraIds.includes(s.id) && !fixed.some((f) => f.id === s.id));
    return [...fixed, ...extras].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  }

  function comingCount(slot, date) {
    const roster = rosterFor(slot, date);
    return roster.filter((s) => {
      const l = lessons.find((x) => x.date === date && x.slotId === slot.id && x.studentId === s.id);
      return !l || l.status !== "absent";
    }).length;
  }

  function lessonFor(studentId, slotId, date) {
    return lessons.find((l) => l.date === date && l.slotId === slotId && l.studentId === studentId);
  }

  // Cuantas veces trabaja cada poni ese dia, para no cargar siempre a los mismos.
  function loadOn(date) {
    const counts = {};
    lessons.forEach((l) => {
      if (l.date === date && l.hid && l.status !== "absent") counts[l.hid] = (counts[l.hid] || 0) + 1;
    });
    return counts;
  }

  // Un poni ya usado en esta misma clase no puede repetir: no se clona.
  function busyInSlot(slotId, date, exceptStudentId) {
    return new Set(
      lessons
        .filter(
          (l) =>
            l.date === date &&
            l.slotId === slotId &&
            l.hid &&
            l.status !== "absent" &&
            l.studentId !== exceptStudentId
        )
        .map((l) => l.hid)
    );
  }

  function handleAddExtra(studentId) {
    if (!studentId) return;
    addExtraLesson(studentId, open.date, open.slot.id);
    showToast("Alumno añadido a la clase");
  }

  function handleRemoveExtra(student) {
    if (!window.confirm("¿Quitar a " + student.name + " de esta clase?")) return;
    removeLesson(student.id, open.date, open.slot.id);
  }

  function handleOpen(entry, date) {
    const isOpen = open && open.slot.id === entry.slot.id && open.date === date;
    setMoving(null);
    setOpen(isOpen ? null : { slot: entry.slot, date, entry });
  }

  function handleToggleDayOff() {
    const off = dayOffOn(exceptions, open.date);
    toggleDayOff(open.date, off ? "" : "Festivo");
    showToast(off ? "Día recuperado" : "Día marcado sin clases");
  }

  function handleToggleClassOff() {
    toggleClassOff(open.date, open.slot.id, "");
    showToast(open.entry.cancelled ? "Clase recuperada" : "Clase anulada");
  }

  function startMove() {
    setMoving({ toDate: open.date, toStart: open.entry.start, toEnd: open.entry.end });
  }

  function confirmMove() {
    moveClass(open.date, open.slot.id, moving.toDate, moving.toStart, moving.toEnd, "");
    setMoving(null);
    setOpen(null);
    showToast("Clase movida al " + fD(moving.toDate));
  }

  if (!slots.length) {
    return (
      <EmptyState icon="📅">
        No hay clases configuradas.
        <br />
        Añádelas en <b>Configurar</b>.
      </EmptyState>
    );
  }

  const openOff = open ? dayOffOn(exceptions, open.date) : null;
  const openRoster = open ? rosterFor(open.slot, open.date) : [];
  const openBusy = open ? busyInSlot(open.slot.id, open.date) : new Set();
  const openLoad = open ? loadOn(open.date) : {};
  const notInClass = open ? activeStudents.filter((s) => !openRoster.some((r) => r.id === s.id)) : [];
  // Una clase traida de otro dia se edita en su dia de origen, no aqui: si no, "mover lo
  // movido" acabaria creando cadenas de excepciones imposibles de deshacer.
  const openEditable = open && canEdit && !open.entry.movedFrom;

  return (
    <>
      <div className="board-toolbar">
        <button className="ib" onClick={() => shiftWeek(-1)}>
          ←
        </button>
        <div>
          <b>
            {fD(week)} — {fD(dates[6])}
          </b>
          <small>Pulsa una clase para pasar lista y asignar ponis</small>
        </div>
        <button className="ib" onClick={() => shiftWeek(1)}>
          →
        </button>
      </div>

      {teachers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: ".6rem" }}>
          {teachers.map((tid) => (
            <span
              key={tid}
              className={"config-code " + boardToneClass(teacherTone(team, tid))}
              style={{ padding: ".1rem .45rem", fontSize: ".72rem", borderRadius: ".3rem", width: "auto" }}
            >
              {teacherName(team, tid)}
            </span>
          ))}
        </div>
      )}

      <div className="board-fit">
        <table className="weekly-board compact-board">
          <thead>
            <tr>
              {dates.map((d, i) => (
                <th key={d} className={d === today ? "is-today" : ""}>
                  {DAY_LABELS[i]}
                  <br />
                  {d.slice(8, 10)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {dates.map((d) => {
                const entries = entriesOfDay(d);
                const off = dayOffOn(exceptions, d);
                return (
                  <td
                    key={d}
                    className={"plan-cell" + (d === today ? " is-today" : "") + (off ? " day-off" : "")}
                    style={{ verticalAlign: "top", padding: ".3rem" }}
                  >
                    {off && <span className="day-off-tag">{off.reason || "Festivo"}</span>}
                    {!entries.length ? (
                      <span className="plan-empty">·</span>
                    ) : (
                      entries.map((entry) => {
                        const slot = entry.slot;
                        const coming = comingCount(slot, d);
                        const isOpen = open && open.slot.id === slot.id && open.date === d;
                        return (
                          <button
                            key={slot.id + (entry.movedFrom || "")}
                            className={
                              "class-card " +
                              boardToneClass(teacherTone(team, slot.teacherId)) +
                              (isOpen ? " is-open" : "") +
                              (entry.cancelled ? " is-off" : "")
                            }
                            onClick={() => handleOpen(entry, d)}
                            title={
                              slotLabel(slot, team) +
                              (entry.cancelled ? (entry.movedTo ? " · movida" : " · anulada") : "") +
                              (entry.movedFrom ? " · traída de otro día" : "")
                            }
                          >
                            <b>
                              {entry.start}
                              {entry.movedFrom ? " ↪" : ""}
                            </b>
                            <span className="class-group">{slotLabel(slot, team) || "Sin profesor"}</span>
                            <span className="class-count">{entry.cancelled ? "—" : coming}</span>
                          </button>
                        );
                      })
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {open && (
        <section className="resource-card" style={{ marginTop: ".7rem" }}>
          <div className="resource-title">
            <div>
              <span className={"resource-icon " + boardToneClass(teacherTone(team, open.slot.teacherId))}>
                {open.entry.start.slice(0, 2)}
              </span>
              <div>
                <h2>
                  {open.entry.start}–{open.entry.end}
                  {slotLabel(open.slot, team) ? " · " + slotLabel(open.slot, team) : ""}
                </h2>
                <small>
                  {capitalize(fDL(open.date))}
                  {open.entry.movedTo ? " · movida al " + fD(open.entry.movedTo) : ""}
                  {open.entry.movedFrom ? " · traída del " + fD(open.entry.movedFrom) : ""}
                  {open.entry.cancelled && !open.entry.movedTo ? " · anulada" : ""}
                </small>
              </div>
            </div>
            <button className="ib" onClick={() => setOpen(null)} aria-label="Cerrar">
              ✕
            </button>
          </div>

          {openEditable && (
            <div className="class-edit-bar">
              <button type="button" className={"btn btsm " + (openOff ? "btr" : "btg")} onClick={handleToggleDayOff}>
                {openOff ? "Quitar festivo" : "Día sin clases"}
              </button>
              {!openOff && (
                <>
                  <button type="button" className="btn btsm btg" onClick={handleToggleClassOff}>
                    {open.entry.cancelled && !open.entry.movedTo ? "Recuperar clase" : "Anular clase"}
                  </button>
                  {open.entry.movedTo ? (
                    <button
                      type="button"
                      className="btn btsm btaz"
                      onClick={() => {
                        moveClass(open.date, open.slot.id, "", "", "", "");
                        setOpen(null);
                        showToast("Traslado deshecho");
                      }}
                    >
                      Deshacer traslado
                    </button>
                  ) : (
                    !open.entry.cancelled && (
                      <button type="button" className="btn btsm btaz" onClick={startMove}>
                        Mover a otro día
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          )}

          {moving && (
            <div className="fb" style={{ marginTop: ".5rem" }}>
              <div className="frow">
                <div className="fcol">
                  <label>Nuevo día</label>
                  <input
                    type="date"
                    value={moving.toDate}
                    onChange={(e) => setMoving({ ...moving, toDate: e.target.value })}
                  />
                </div>
                <div className="fcol">
                  <label>Empieza</label>
                  <input
                    type="time"
                    value={moving.toStart}
                    onChange={(e) => setMoving({ ...moving, toStart: e.target.value })}
                  />
                </div>
                <div className="fcol">
                  <label>Acaba</label>
                  <input
                    type="time"
                    value={moving.toEnd}
                    onChange={(e) => setMoving({ ...moving, toEnd: e.target.value })}
                  />
                </div>
              </div>
              <div className="class-edit-bar" style={{ marginTop: ".5rem" }}>
                <button type="button" className="btn btsm bts" onClick={confirmMove}>
                  Confirmar
                </button>
                <button type="button" className="btn btsm btg" onClick={() => setMoving(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {open.entry.cancelled ? (
            <p style={{ fontSize: ".82rem", opacity: 0.7, padding: ".5rem 0" }}>
              {open.entry.movedTo
                ? "Esta clase se da el " + fD(open.entry.movedTo) + ". Los ponis se asignan allí."
                : "Clase anulada. Recupérala para volver a pasar lista."}
            </p>
          ) : !openRoster.length ? (
            <p style={{ fontSize: ".82rem", opacity: 0.7, padding: ".5rem 0" }}>Nadie apuntado a esta clase.</p>
          ) : (
            <div className="config-list">
              {openRoster.map((s) => {
                const lesson = lessonFor(s.id, open.slot.id, open.date);
                const absent = lesson ? lesson.status === "absent" : false;
                const isExtra = lesson ? !!lesson.extra : false;
                return (
                  <div className="config-row" key={s.id} style={{ opacity: absent ? 0.45 : 1 }}>
                    <span className={"config-code " + boardToneClass(s.tone)}>{s.code}</span>
                    <div>
                      <b style={{ textDecoration: absent ? "line-through" : "none" }}>
                        {s.name} {s.surname}
                      </b>
                      <small>{absent ? "No viene" : isExtra ? "Recuperación" : "Fijo"}</small>
                    </div>
                    <select
                      value={lesson && lesson.hid ? lesson.hid : ""}
                      disabled={absent}
                      style={{ flexShrink: 0, maxWidth: "9rem" }}
                      onChange={(e) => setLessonHorse(s.id, open.date, open.slot.id, e.target.value || null)}
                    >
                      <option value="">— Sin poni —</option>
                      {horses.map((h) => {
                        const taken = openBusy.has(h.id) && (!lesson || lesson.hid !== h.id);
                        return (
                          <option key={h.id} value={h.id} disabled={taken}>
                            {h.name}
                            {openLoad[h.id] ? " (" + openLoad[h.id] + ")" : ""}
                            {taken ? " — ocupado" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      className={"btn btsm " + (absent ? "btr" : "btg")}
                      style={{ flexShrink: 0 }}
                      onClick={() => toggleLessonAbsent(s.id, open.date, open.slot.id)}
                    >
                      {absent ? "Vuelve" : "Falta"}
                    </button>
                    {isExtra && (
                      <button className="db" onClick={() => handleRemoveExtra(s)}>
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!open.entry.cancelled && notInClass.length > 0 && (
            <div className="fb" style={{ marginTop: ".5rem" }}>
              <div className="fcol">
                <label>Añadir alumno puntual</label>
                <select value="" onChange={(e) => handleAddExtra(e.target.value)}>
                  <option value="">— Elegir alumno —</option>
                  {notInClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.surname}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}