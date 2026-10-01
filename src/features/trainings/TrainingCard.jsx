import { workTypeById } from "../../lib/constants.js";
import { fD } from "../../lib/date.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useStableData } from "../../hooks/useStableData.js";

// Ports the training card markup in rHorse's "entrenos" tab (public/legacy-app.js:1704-1711).
export function TrainingCard({ training }) {
  const { can } = usePermissions();
  const { deleteTraining } = useStableData();
  const w = workTypeById(training.wtype);

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTraining(training.id);
  }

  return (
    <div className="tc">
      <div className="tc-top">
        <div>
          <span className="tc-ti">
            {w.i} {w.l}
          </span>
          <span className="tc-dt"> · {fD(training.date)}</span>
          <span className="br">{training.rating}/10</span>
          <div className="tc-su">{training.dur} min</div>
        </div>
        {can("deleteItems") && (
          <button className="db" onClick={handleDelete}>
            ✕
          </button>
        )}
      </div>
      {training.state && (
        <div className="tc-de">
          <b>Estado:</b> {training.state}
        </div>
      )}
      {training.feel && (
        <div className="tc-de">
          <b>Sensaciones:</b> {training.feel}
        </div>
      )}
      {training.notes && (
        <div className="tc-de">
          <b>Obs:</b> {training.notes}
        </div>
      )}
    </div>
  );
}
