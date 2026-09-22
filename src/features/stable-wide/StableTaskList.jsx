import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { FK } from "../../lib/constants.js";
import { fD } from "../../lib/date.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { ctasksDueToday } from "./stableTaskHelpers.js";

// Ports the "tareas" tab of rCuadra (public/legacy-app.js:2213-2257).
export function StableTaskList() {
  const { ctasks, team, doneStableTask, deleteStableTask } = useStableData();
  const navigate = useNavigate();

  const due = ctasksDueToday(ctasks);

  function handleDelete(id) {
    if (!window.confirm("¿Eliminar?")) return;
    deleteStableTask(id);
  }

  return (
    <>
      {due.length > 0 && (
        <div
          style={{
            background: "var(--ml)",
            border: "1px solid #D8C8E6",
            borderRadius: "12px",
            padding: ".75rem .9rem",
            marginBottom: ".85rem",
          }}
        >
          <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--mo)", marginBottom: ".3rem" }}>
            🏠 Pendientes hoy ({due.length})
          </div>
          {due.slice(0, 3).map((t) => (
            <div key={t.id} style={{ fontSize: ".78rem", color: "#5B3A6E" }}>
              · {t.icon || "📌"} {t.name}
            </div>
          ))}
          {due.length > 3 && (
            <div style={{ fontSize: ".75rem", color: "var(--mo)" }}>y {due.length - 3} más...</div>
          )}
        </div>
      )}
      {!ctasks.length ? (
        <EmptyState icon="🏠">
          Sin tareas de cuadra.
          <br />
          Pulsa <b>+</b> para añadir.
        </EmptyState>
      ) : (
        ctasks.map((t) => {
          const m = t.pid ? team.find((x) => x.id === t.pid) : null;
          const fr = FK.find((f) => f.id === t.freq) || { l: t.freq, i: "📌" };
          const isDue = due.some((d) => d.id === t.id);
          return (
            <div className="rrc" key={t.id}>
              <div className="rric">{t.icon || "📌"}</div>
              <div className="rrinf">
                <div className="rrl">{t.name}</div>
                <div className="rrm">
                  {m ? `${m.emoji || "👤"} ${m.name}` : "Sin asignar"}
                  {t.notes ? " · " + t.notes : ""}
                </div>
                <span className="frb">
                  {fr.i} {fr.l}
                </span>
                {isDue && (
                  <span className="ap" style={{ marginLeft: ".3rem" }}>
                    ⏰ Toca hoy
                  </span>
                )}
                {t.ld && (
                  <span style={{ fontSize: ".7rem", color: "var(--gr)", marginLeft: ".3rem" }}>
                    Última: {fD(t.ld)}
                  </span>
                )}
              </div>
              <div className="ca">
                {isDue && (
                  <button
                    className="ib"
                    style={{ background: "var(--vl)", color: "var(--v)", borderColor: "var(--v)", fontSize: ".8rem" }}
                    onClick={() => doneStableTask(t.id)}
                  >
                    ✓
                  </button>
                )}
                <button className="ib" onClick={() => navigate(`/cuadra/tasks/${t.id}/edit`)}>
                  ✏️
                </button>
                <button className="db" onClick={() => handleDelete(t.id)}>
                  ✕
                </button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
