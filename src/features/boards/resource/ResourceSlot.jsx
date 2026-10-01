import { useStableData } from "../../../hooks/useStableData.js";
import { boardAssignment, horseConflict } from "../boardHelpers.js";

// Ports resourceCell (public/legacy-app.js:1443-1447): a single droppable/clickable slot,
// free or occupied. Drag-and-drop uses the same {hid} (new placement) vs {assignmentId}
// (move) dataTransfer payload distinction as legacy.
export function ResourceSlot({ type, date, resourceId, slotId, position, onDropCell, onClickCell }) {
  const { horses, boardConfig, boardAssignments } = useStableData();
  const assignment = boardAssignment(boardAssignments, type, date, resourceId, slotId, position);

  function handleDragOver(ev) {
    ev.preventDefault();
  }
  function handleDrop(ev) {
    onDropCell(ev, resourceId, slotId, position);
  }

  if (!assignment) {
    return (
      <td
        className="resource-cell free"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => onClickCell(resourceId, slotId, position, null)}
      >
        <span>＋ Libre</span>
      </td>
    );
  }

  const horse = horses.find((h) => h.id === assignment.hid);
  const conflict = horseConflict(boardConfig, boardAssignments, assignment.hid, date, type, slotId);

  function handleDragStart(ev) {
    try {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ assignmentId: assignment.id }));
    } catch (e) {}
  }

  return (
    <td className={"resource-cell occupied" + (conflict ? " conflict" : "")} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div
        className="assigned-horse"
        draggable="true"
        onDragStart={handleDragStart}
        onClick={(ev) => {
          ev.stopPropagation();
          onClickCell(resourceId, slotId, position, assignment);
        }}
      >
        <span>{horse && horse.photo ? <img src={horse.photo.url} alt="" /> : "🐴"}</span>
        <b>{horse ? horse.name : "Caballo"}</b>
        <small>{conflict ? "⚠ Coincidencia" : "Arrastra para mover"}</small>
      </div>
    </td>
  );
}
