import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { StatGrid } from "../../../components/StatGrid.jsx";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { TrainingCard } from "../../trainings/TrainingCard.jsx";

// Ports the "entrenos" tab body of rHorse (public/legacy-app.js:1698-1713).
export function TrainingTab({ horse }) {
  const { trainings } = useStableData();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const tr = useMemo(
    () => trainings.filter((t) => t.hid === horse.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [trainings, horse.id]
  );
  const avgRating = tr.length
    ? (tr.reduce((s, t) => s + Number(t.rating || 0), 0) / tr.length).toFixed(1)
    : "–";
  const totalMinutes = tr.reduce((s, t) => s + Number(t.dur || 0), 0);

  return (
    <>
      <StatGrid
        stats={[
          { value: tr.length, label: "Sesiones" },
          { value: avgRating, label: "Val. media" },
          { value: totalMinutes, label: "Min." },
        ]}
      />
      <div className="r2" style={{ marginBottom: "1rem" }}>
        <button className="btn bts" onClick={() => navigate(`/horses/${horse.id}/trainings/new`)}>
          + Entreno
        </button>
        {can("reports") && (
          <button className="btn" onClick={() => navigate(`/horses/${horse.id}/report`)}>
            📄 Informe
          </button>
        )}
      </div>
      {!tr.length ? (
        <EmptyState>Sin entrenamientos todavía.</EmptyState>
      ) : (
        tr.map((t) => <TrainingCard key={t.id} training={t} />)
      )}
    </>
  );
}
