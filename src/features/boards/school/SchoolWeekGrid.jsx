import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { addD, fD, td } from "../../../lib/date.js";
import { boardWeekDates, boardToneClass } from "../boardHelpers.js";
import { teacherTone, teacherName, slotLabel } from "./schoolHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CARD = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "1px solid rgba(0,0,0,.1)",
  borderLeftWidth: ".22rem",
  borderRadius: ".4rem",
  padding: ".32rem .4rem",
  marginBottom: ".28rem",
  background: "var(--cardbg, rgba(255,255,255,.6))",
  cursor: "pointer",
  lineHeight: 1.25,
};

// Vista semanal de la escuela: una columna por dia, un recuadro por clase. Varias clases
// pueden coincidir en hora — son grupos simultaneos con profesores distintos — asi que la
// columna es una pila ordenada por hora, no una rejilla de franjas fijas.
export function SchoolWeekGrid({ week }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { students, lessons, horses, team, boardConfig } = useStableData();
  const [open, setOpen] = useState(null);

  const dates = boardWeekDates(week);
  const today = td();
  const slots = boardConfig.classSlots || [];
  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  function shiftWeek(n) {
    const params = new URLSearchParams(searchParams);
    params.set("week", addD(week, n * 7));
    navigate("/boards?" + params.toString());
  }

  function slotsOfDay(dayIndex) {
    return slots
      .filter((s) => s.weekday === dayIndex + 1)
      .sort((a, b) => a.start.localeCompare(b.start) || (a.groupName || "").localeCompare(b.groupName || ""));
  }

  // Alumnos de esa clase: los fijos por horario mas los puntuales apuntados ese dia.
  function rosterFor(slot, date) {
    const dayLessons = lessons.filter((l) => l.date === date && l.slotId === slot.id);
    const fixed = activeStudents.filter((s) => (s.schedule || []).includes(slot.id));
    const extras = activeStudents.filter(
      (s) => dayLessons.some((l) => l.studentId === s.id && l.extra) && !fixed.some((f) => f.id === s.id)
    );
    return [...fixed, ...extras].map((s) => {
      const lesson = dayLessons.find((l) => l.studentId === s.id);
      const horse = lesson && lesson.hid ? horses.find((h) => h.id === lesson.hid) : null;
      return {
        student: s,
        absent: lesson ? lesson.status === "absent" : false,
        extra: lesson ? !!lesson.extra : false,
        horseName: horse ? horse.name : null,
      };
    });
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

  const openData = open ? rosterFor(open.slot, open.date) : [];
  const teachers = useMemo(
    () => [...new Set(slots.map((s) => s.teacherId).filter(Boolean))],
    [slots]
  );

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
          <small>Pulsa una clase para ver los alumnos</small>
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
              {dates.map((d, i) => {
                const daySlots = slotsOfDay(i);
                return (
                  <td
                    key={d}
                    className={"plan-cell" + (d === today ? " is-today" : "")}
                    style={{ verticalAlign: "top", padding: ".3rem" }}
                  >
                    {!daySlots.length ? (
                      <span className="plan-empty">·</span>
                    ) : (
                      daySlots.map((slot) => {
                        const roster = rosterFor(slot, d);
                        const coming = roster.filter((r) => !r.absent).length;
                        const isOpen = open && open.slot.id === slot.id && open.date === d;
                        const tone = teacherTone(team, slot.teacherId);
                        return (
                          <button
                            key={slot.id}
                            className={boardToneClass(tone)}
                            style={{
                              ...CARD,
                              outline: isOpen ? "2px solid currentColor" : "none",
                            }}
                            onClick={() => setOpen(isOpen ? null : { slot, date: d })}
                          >
                            <b style={{ fontSize: ".74rem", display: "block" }}>{slot.start}</b>
                            <span style={{ fontSize: ".68rem", opacity: 0.85, display: "block" }}>
                              {slotLabel(slot, team) || "Sin profesor"}
                            </span>
                            <span style={{ fontSize: ".68rem", fontWeight: 600 }}>
                              {coming} {coming === 1 ? "alumno" : "alumnos"}
                            </span>
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
                {open.slot.start.slice(0, 2)}
              </span>
              <div>
                <h2>
                  {open.slot.start}–{open.slot.end}
                </h2>
                <small>
                  {fD(open.date)}
                  {slotLabel(open.slot, team) ? " · " + slotLabel(open.slot, team) : ""}
                </small>
              </div>
            </div>
            <button className="ib" onClick={() => setOpen(null)} aria-label="Cerrar">
              ✕
            </button>
          </div>
          {!openData.length ? (
            <p style={{ fontSize: ".82rem", opacity: 0.7, padding: ".5rem 0" }}>Nadie apuntado a esta clase.</p>
          ) : (
            <div className="config-list">
              {openData.map((r) => (
                <div className="config-row" key={r.student.id} style={{ opacity: r.absent ? 0.45 : 1 }}>
                  <span className={"config-code " + boardToneClass(r.student.tone)}>{r.student.code}</span>
                  <div>
                    <b style={{ textDecoration: r.absent ? "line-through" : "none" }}>
                      {r.student.name} {r.student.surname}
                    </b>
                    <small>
                      {r.absent
                        ? "No viene"
                        : r.horseName
                        ? r.horseName + (r.extra ? " · recuperación" : "")
                        : "Sin poni asignado"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}