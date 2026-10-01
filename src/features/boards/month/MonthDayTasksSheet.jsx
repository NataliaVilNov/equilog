import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { TaskCard } from "../../tasks/TaskCard.jsx";
import { fDL } from "../../../lib/date.js";

// Opened by tapping a day's task-count badge in MonthBoardGrid. Reuses TaskCard directly —
// it already handles status-cycling, occurrence reassignment, edit-navigation, and delete,
// so this sheet is just a list + a "create" entry point, no new task-row component needed.
export function MonthDayTasksSheet({ date, tasks, onClose, onCreateTask, canCreate }) {
  return (
    <SlideUpSheet title={fDL(date)} onClose={onClose}>
      {tasks.length ? (
        tasks.map((t) => <TaskCard key={t.id + (t.occurrenceDate || "")} task={t} />)
      ) : (
        <EmptyState icon="📋">Sin tareas este día.</EmptyState>
      )}
      {canCreate && (
        <button type="button" className="btn bts btbl" style={{ marginTop: ".65rem" }} onClick={onCreateTask}>
          + Nueva tarea
        </button>
      )}
    </SlideUpSheet>
  );
}
