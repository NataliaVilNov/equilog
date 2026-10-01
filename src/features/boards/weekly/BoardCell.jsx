import { boardActivity, boardToneClass } from "../boardHelpers.js";

// One weekly-board grid cell. Extracted from WeeklyBoardGrid so the toolbar/sheet dispatch
// logic added alongside the multi-tool rework doesn't balloon that file. Renders the
// assigned activities (chevron-separated, same convention the single-activity version
// already used), a checkmark/strikethrough for done ones, a note preview line, and a
// pending/linked badge on the VET activity if present.
export function BoardCell({
  date,
  isToday,
  activeTool,
  plan,
  boardActivities,
  vetActivityId,
  isCopySource,
  isCopyTarget,
  onClick,
}) {
  const activities = (plan && plan.activities) || [];
  const completed = (plan && plan.completed) || [];
  const note = (plan && plan.note) || "";
  const vetHealthId = plan && plan.vetHealthId;
  const allDone = activities.length > 0 && completed.length === activities.length;

  const className =
    "plan-cell" +
    (isToday ? " is-today" : "") +
    (activeTool ? " quick-mode" : "") +
    (allDone ? " cell-all-done" : "") +
    (isCopySource ? " copy-source" : "") +
    (isCopyTarget ? " copy-target" : "");

  return (
    <td key={date} className={className} onClick={onClick}>
      {activities.length ? (
        <>
          <div className="plan-sequence">
            {activities.map((id, i) => {
              const a = boardActivity(boardActivities, id);
              const isDone = completed.includes(id);
              return (
                <span key={id}>
                  <span
                    className={
                      "plan-code " + boardToneClass(a.tone) + (isDone ? " cell-done" : "") + (activeTool === id ? " quick-hit" : "")
                    }
                    title={a.label}
                  >
                    {isDone ? "✓" : a.code}
                  </span>
                  {id === vetActivityId && (
                    <em className={"vet-badge " + (vetHealthId ? "vet-linked" : "vet-pending")}>
                      {vetHealthId ? "✓" : "?"}
                    </em>
                  )}
                  {i < activities.length - 1 && <i>›</i>}
                </span>
              );
            })}
          </div>
          {note && <div className="cell-note">{note}</div>}
        </>
      ) : note ? (
        <div className="cell-note">{note}</div>
      ) : (
        <span className="plan-empty">＋</span>
      )}
    </td>
  );
}
