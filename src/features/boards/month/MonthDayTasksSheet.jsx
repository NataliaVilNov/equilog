import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";
import { TaskCard } from "../../tasks/TaskCard.jsx";
import { fDL } from "../../../lib/date.js";
import { healthTypeById } from "../../../lib/constants.js";
import { boardToneClass } from "../boardHelpers.js";

// Opened by tapping a day square in MonthBoardGrid: everything that day in one place. Tasks
// reuse TaskCard directly (it already handles status-cycling, occurrence reassignment,
// edit-navigation and delete); the activities/health sections are read-only summaries with a
// jump into the weekly board or the cell editor, and "+ Nueva tarea" is the create entry
// point that used to live as a badge inside every square.
export function MonthDayTasksSheet({
  date,
  tasks,
  plans,
  healthDue,
  onClose,
  onCreateTask,
  canCreate,
  onOpenWeek,
  onOpenCell,
}) {
  const empty = !tasks.length && !plans.length && !healthDue.length;
  return (
    <SlideUpSheet title={fDL(date)} onClose={onClose}>
      {empty && <div className="month-sheet-empty">Nada previsto este día.</div>}

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
