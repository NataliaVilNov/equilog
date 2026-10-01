import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { boardPeriodicValue, periodicStatus, boardToneClass } from "../boardHelpers.js";

// Ports the periodic-column cell inside rWeeklyBoard (public/legacy-app.js:1368) plus
// editBoardPeriodic (public/legacy-app.js:1397-1403).
export function PeriodicColumnCell({ hid, column }) {
  const { periodicBoardDates, setBoardPeriodic } = useStableData();
  const { showToast } = useToast();
  const value = boardPeriodicValue(periodicBoardDates, hid, column.id);
  const status = periodicStatus(value);

  function edit() {
    const val = window.prompt(
      "Introduce la próxima fecha (AAAA-MM-DD). Déjalo vacío para borrar.",
      value || ""
    );
    if (val === null) return;
    const clean = val.trim();
    if (clean && !/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      showToast("Fecha no válida. Usa AAAA-MM-DD");
      return;
    }
    setBoardPeriodic(hid, column.id, clean);
    showToast("Fecha actualizada");
  }

  return (
    <td className="periodic-cell" onClick={edit}>
      <button
        type="button"
        className={"periodic-compact " + boardToneClass(status.cls)}
        title={`${column.label}: ${value || "sin fecha"}`}
      >
        <b>{value ? value.slice(8, 10) + "/" + value.slice(5, 7) : "—"}</b>
        <small>{status.txt}</small>
      </button>
    </td>
  );
}
