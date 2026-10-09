import { useState } from "react";
import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";
import { TaskCard } from "../../tasks/TaskCard.jsx";
import { fD, fDL } from "../../../lib/date.js";
import { healthTypeById } from "../../../lib/constants.js";
import { boardToneClass } from "../boardHelpers.js";

// Opened by tapping a day square in MonthBoardGrid: everything that day in one place. Tasks
// reuse TaskCard directly (it already handles status-cycling, occurrence reassignment,
// edit-navigation and delete); the classes section is where a bank holiday or a one-off
// change to the weekly timetable is made, and activities/health are read-only summaries with
// a jump into the weekly board or the cell editor.
export function MonthDayTasksSheet({
  date,
  classes = [],
  dayOff,
  canEditClasses,
  onToggleDayOff,
  onToggleClassOff,
  onMoveClass,
  tasks,
  plans,
  healthDue,
  onClose,
  onCreateTask,
  canCreate,
  onOpenWeek,
  onOpenCell,
}) {
  // Franja que se está moviendo ahora mismo, con el destino que va eligiendo el usuario.
  const [moving, setMoving] = useState(null);

  const empty = !classes.length && !tasks.length && !plans.length && !healthDue.length;

  function startMove(c) {
    setMoving({ slotId: c.slot.id, toDate: date, toStart: c.start, toEnd: c.end });
  }

  function confirmMove() {
    onMoveClass(moving.slotId, moving.toDate, moving.toStart, moving.toEnd);
    setMoving(null);
  }

  function statusText(c) {
    if (c.movedTo) return "Movida al " + fD(c.movedTo);
    if (c.cancelled) return c.reason || "Anulada";
    if (c.movedFrom) return "Traída del " + fD(c.movedFrom);
    return c.teacher || "";
  }

  return (
    <SlideUpSheet title={fDL(date)} onClose={onClose}>
      {empty && <div className="month-sheet-empty">Nada previsto este día.</div>}

      {classes.length > 0 && (
        <div className="month-sheet-section">
          <h3>Clases</h3>

          {canEditClasses && (
            <button
              type="button"
              className={"btn btsm btbl " + (dayOff ? "btr" : "btg")}
              style={{ marginBottom: ".5rem" }}
              onClick={() => onToggleDayOff(dayOff ? "" : "Festivo")}
            >
              {dayOff ? "Quitar el festivo: volver a dar clase" : "Marcar día sin clases (festivo)"}
            </button>
          )}

          {classes.map((c) => {
            const key = c.slot.id + (c.movedFrom || "");
            const isMoving = moving && moving.slotId === c.slot.id && !c.movedFrom;
            return (
              <div key={key} className={"month-class-row " + c.tone + (c.cancelled ? " is-off" : "")}>
                <div className="month-class-info">
                  <b>
                    {c.start}–{c.end} · {c.slot.groupName || c.teacher || "Clase"}
                  </b>
                  <small>
                    {statusText(c)}
                    {c.count ? ` · ${c.count} alumno${c.count !== 1 ? "s" : ""}` : ""}
                  </small>
                </div>

                {canEditClasses && !dayOff && !c.movedFrom && (
                  <div className="month-class-actions">
                    <button type="button" className="btn btsm btg" onClick={() => onToggleClassOff(c.slot.id, "")}>
                      {c.cancelled ? "Recuperar" : "Anular"}
                    </button>
                    {!c.cancelled && (
                      <button type="button" className="btn btsm btaz" onClick={() => startMove(c)}>
                        Mover
                      </button>
                    )}
                  </div>
                )}

                {isMoving && (
                  <div className="fb" style={{ margin: ".5rem 0 0", width: "100%" }}>
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
                    <div className="month-class-actions" style={{ marginTop: ".5rem" }}>
                      <button type="button" className="btn btsm bts" onClick={confirmMove}>
                        Confirmar
                      </button>
                      <button type="button" className="btn btsm btg" onClick={() => setMoving(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="month-sheet-section">
          <h3>Tareas</h3>
          {tasks.map((t) => (
            <TaskCard key={t.id + (t.occurrenceDate || "")} task={t} />
          ))}
        </div>
      )}

      {plans.length > 0 && (
        <div className="month-sheet-section">
          <h3>Actividades</h3>
          {plans.map((p) => (
            <button type="button" key={p.horse.id} className="month-sheet-row" onClick={() => onOpenCell(p.horse.id)}>
              <b>{p.horse.name}</b>
              <span className="month-sheet-codes">
                {p.activities.map((a) => (
                  <span key={a.id} className={"plan-code " + boardToneClass(a.tone) + (a.done ? " cell-done" : "")} title={a.label}>
                    {a.done ? "✓ " : ""}
                    {a.label}
                  </span>
                ))}
              </span>
              {p.note && <small>{p.note}</small>}
            </button>
          ))}
        </div>
      )}

      {healthDue.length > 0 && (
        <div className="month-sheet-section">
          <h3>Salud</h3>
          {healthDue.map((r) => (
            <div key={r.id} className="month-sheet-row static">
              <b>{r.horseName}</b>
              <span>
                {healthTypeById(r.type).i} {r.label || healthTypeById(r.type).l}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="month-sheet-actions">
        {canCreate && (
          <button type="button" className="btn bts btbl" onClick={onCreateTask}>
            + Nueva tarea
          </button>
        )}
        <button type="button" className="btn btg btbl" onClick={onOpenWeek}>
          Ver semana
        </button>
      </div>
    </SlideUpSheet>
  );
}