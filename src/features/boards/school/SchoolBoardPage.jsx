import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { addD, fDL } from "../../../lib/date.js";
import { boardToneClass } from "../boardHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Día de la semana de una fecha "YYYY-MM-DD" en el formato de classSlots (1=lunes…7=domingo).
function weekdayOf(date) {
  const d = new Date(`${date}T12:00:00`).getDay();
  return d === 0 ? 7 : d;
}

// Pizarra diaria de clases. Muestra las franjas del día con sus alumnos fijos, permite
// añadir alumnos puntuales (recuperaciones) y asignar un poni a cada uno. El contador de
// montas por poni es del día: el semanal vive en la pizarra principal.
export function SchoolBoardPage({ date }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { horses, students, lessons, boardConfig, setLessonHorse, toggleLessonAbsent, addExtraLesson, removeLesson } =
    useStableData();
  const { showToast } = useToast();

  const weekday = weekdayOf(date);
  const daySlots = useMemo(
    () =>
      (boardConfig.classSlots || [])
        .filter((s) => s.weekday === weekday)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [boardConfig.classSlots, weekday]
  );

  const dayLessons = useMemo(() => lessons.filter((l) => l.date === date), [lessons, date]);
  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Cuántas veces trabaja cada poni hoy, para no cargar siempre a los mismos.
  const loadToday = useMemo(() => {
    const counts = {};
    dayLessons.forEach((l) => {
      if (l.hid && l.status !== "absent") counts[l.hid] = (counts[l.hid] || 0) + 1;
    });
    return counts;
  }, [dayLessons]);

  function shiftDate(n) {
    const params = new URLSearchParams(searchParams);
    params.set("date", addD(date, n));
    navigate(`/boards?${params.toString()}`);
  }

  // Alumnos de una franja: los fijos por horario más los puntuales apuntados hoy.
  function rosterFor(slot) {
    const fixed = activeStudents.filter((s) => (s.schedule || []).includes(slot.id));
    const extraIds = dayLessons.filter((l) => l.slotId === slot.id && l.extra).map((l) => l.studentId);
    const extras = activeStudents.filter((s) => extraIds.includes(s.id) && !fixed.some((f) => f.id === s.id));
    return [...fixed, ...extras].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  }

  function lessonFor(studentId, slotId) {
    return dayLessons.find((l) => l.studentId === studentId && l.slotId === slotId);
  }

  // Un poni ya usado en esta misma franja no puede repetir: no se clona.
  function busyInSlot(slotId, exceptStudentId) {
    return new Set(
      dayLessons
        .filter((l) => l.slotId === slotId && l.hid && l.status !== "absent" && l.studentId !== exceptStudentId)
        .map((l) => l.hid)
    );
  }

  function handleAddExtra(slot, studentId) {
    if (!studentId) return;
    addExtraLesson(studentId, date, slot.id);
    showToast("Alumno añadido a la clase");
  }

  function handleRemoveExtra(student, slot) {
    if (!window.confirm(`¿Quitar a ${student.name} de esta clase?`)) return;
    removeLesson(student.id, date, slot.id);
  }

  return (
    <>
      <div className="board-toolbar">
        <button className="ib" onClick={() => shiftDate(-1)}>
          ←
        </button>
        <div>
          <b>{capitalize(fDL(date))}</b>
          <small>
            {daySlots.length
              ? `${daySlots.length} clase${daySlots.length !== 1 ? "s" : ""} hoy`
              : "Sin clases este día"}
          </small>
        </div>
        <button className="ib" onClick={() => shiftDate(1)}>
          →
        </button>
      </div>

      {!daySlots.length ? (
        <EmptyState icon="📅">
          No hay clases configuradas para este día.
          <br />
          Añade sus horarios en <b>Configurar</b>.
        </EmptyState>
      ) : (
        daySlots.map((slot) => {
          const roster = rosterFor(slot);
          const busy = busyInSlot(slot.id);
          const notInClass = activeStudents.filter((s) => !roster.some((r) => r.id === s.id));
          return (
            <section className="resource-card" key={slot.id}>
              <div className="resource-title">
                <div>
                  <span className="resource-icon teal">{slot.start.slice(0, 2)}</span>
                  <div>
                    <h2>
                      {slot.start}–{slot.end}
                    </h2>
                    <small>
                      {roster.length} alumno{roster.length !== 1 ? "s" : ""}
                    </small>
                  </div>
                </div>
              </div>

              {!roster.length ? (
                <p style={{ fontSize: ".82rem", opacity: 0.7, padding: ".5rem 0" }}>
                  Nadie apuntado a esta hora.
                </p>
              ) : (
                <div className="config-list">
                  {roster.map((s) => {
                    const lesson = lessonFor(s.id, slot.id);
                    const absent = lesson?.status === "absent";
                    const isExtra = !!lesson?.extra;
                    return (
                      <div className="config-row" key={s.id} style={{ opacity: absent ? 0.45 : 1 }}>
                        <span className={"config-code " + boardToneClass(s.tone)}>{s.code}</span>
                        <div>
                          <b>
                            {s.name} {s.surname}
                          </b>
                          <small>{absent ? "No viene" : isExtra ? "Recuperación" : "Fijo"}</small>
                        </div>
                        <select
                          value={lesson?.hid || ""}
                          disabled={absent}
                          style={{ flexShrink: 0, maxWidth: "9rem" }}
                          onChange={(e) => setLessonHorse(s.id, date, slot.id, e.target.value || null)}
                        >
                          <option value="">— Sin poni —</option>
                          {horses.map((h) => (
                            <option key={h.id} value={h.id} disabled={busy.has(h.id) && lesson?.hid !== h.id}>
                              {h.name}
                              {loadToday[h.id] ? ` (${loadToday[h.id]})` : ""}
                              {busy.has(h.id) && lesson?.hid !== h.id ? " — ocupado" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          className={"btn btsm " + (absent ? "btr" : "btg")}
                          style={{ flexShrink: 0 }}
                          onClick={() => toggleLessonAbsent(s.id, date, slot.id)}
                        >
                          {absent ? "Vuelve" : "Falta"}
                        </button>
                        {isExtra && (
                          <button className="db" onClick={() => handleRemoveExtra(s, slot)}>
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {notInClass.length > 0 && (
                <div className="fb" style={{ marginTop: ".5rem" }}>
                  <div className="fcol">
                    <label>Añadir alumno puntual</label>
                    <select value="" onChange={(e) => handleAddExtra(slot, e.target.value)}>
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
          );
        })
      )}
    </>
  );
}