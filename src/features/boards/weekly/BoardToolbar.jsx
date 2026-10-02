import { boardToneClass } from "../boardHelpers.js";

const UTILITY_TOOLS = [
  { id: "note", code: "✎", label: "Nota" },
  { id: "done", code: "✓", label: "Hecho" },
  { id: "erase", code: "⌫", label: "Borrar" },
];

// Replaces QuickAssignToolbar: the stable's configured activities plus 3 fixed utility
// tools (Nota/Hecho/Borrar) that are always present regardless of what activities
// are configured — matches the reference app's always-present toolbar shape. Exactly one
// tool is active at a time; WeeklyBoardGrid dispatches on whichever one is armed when a
// cell is tapped.
export function BoardToolbar({ activities, active, onToggle }) {
  return (
    <div className="quick-board-panel">
      <div className="quick-board-title">
        <div>
          <b>Actividades</b>
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
        {UTILITY_TOOLS.map((t) => (
          <button
            key={t.id}
            className={"quick-board-btn ba-gray" + (active === t.id ? " active" : "")}
            onClick={() => onToggle(t.id)}
          >
            <span>{t.code}</span>
            <small>{t.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
