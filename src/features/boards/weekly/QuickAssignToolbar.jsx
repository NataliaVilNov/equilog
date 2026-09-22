import { boardToneClass } from "../boardHelpers.js";

// Ports the quick-assign panel inside rWeeklyBoard (public/legacy-app.js:1363). The armed
// activity id was a module-level global (_boardQuickActivity) in legacy; here it's state
// owned by WeeklyBoardGrid and passed down.
export function QuickAssignToolbar({ activities, active, onToggle }) {
  return (
    <div className="quick-board-panel">
      <div className="quick-board-title">
        <div>
          <b>Asignación rápida</b>
          <small>
            Pulsa una actividad y después toca todas las casillas necesarias. El orden se
            ajusta entrando en cada caballo.
          </small>
        </div>
        {active && (
          <button className="btn btg btsm" onClick={() => onToggle(active)}>
            Terminar
          </button>
        )}
      </div>
      <div className="quick-board-actions">
        {activities.map((a) => (
          <button
            key={a.id}
            className={"quick-board-btn " + boardToneClass(a.tone) + (active === a.id ? " active" : "")}
            onClick={() => onToggle(a.id)}
          >
            <span>{a.code}</span>
            <small>{a.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
