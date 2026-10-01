import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";
import { boardActivity, boardToneClass } from "../boardHelpers.js";

// The "Hecho" tool's cell sheet: lists every activity currently assigned to the cell, each
// independently tappable to toggle its own done state — saved instantly per tap (no
// separate save button), matching the reference app's checklist behavior. Also the main
// discovery path to BoardCellPage's full chronological-order editor — tap-toggling can only
// append/remove an activity, not reorder two already-assigned ones relative to each other.
export function DoneChecklistSheet({ activityIds, completed, allActivities, onToggle, onClose, onEditOrder }) {
  return (
    <SlideUpSheet title="Marcar hecho" onClose={onClose}>
      <div className="config-list">
        {activityIds.map((id) => {
          const a = boardActivity(allActivities, id);
          const isDone = completed.includes(id);
          return (
            <button
              key={id}
              type="button"
              className="config-row"
              onClick={() => onToggle(id)}
              style={{ background: isDone ? "var(--vl)" : "#fff", width: "100%", textAlign: "left" }}
            >
              <span className={"config-code " + boardToneClass(a.tone)}>{isDone ? "✓" : a.code}</span>
              <div>
                <b>{a.label}</b>
              </div>
              <small style={{ color: isDone ? "var(--v)" : "var(--gr)", fontWeight: 700, flexShrink: 0 }}>
                {isDone ? "Hecho" : "Pendiente"}
              </small>
            </button>
          );
        })}
      </div>
      {onEditOrder && (
        <button type="button" className="text-link" style={{ marginTop: ".6rem" }} onClick={onEditOrder}>
          Editar orden completo →
        </button>
      )}
    </SlideUpSheet>
  );
}
