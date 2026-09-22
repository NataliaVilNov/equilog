import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { activityById } from "../../lib/constants.js";
import { fD } from "../../lib/date.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { AlertCard } from "./AlertCard.jsx";
import { upcomingHealthAlerts, pendingSessionAlerts, visibleAlertsForUser } from "./alertSelectors.js";

// Ports rAlerts (public/legacy-app.js:2345-2373).
export function AlertsPage() {
  const { health, horses, sessionAlerts, team } = useStableData();
  const { isAdmin, myTeamMember } = usePermissions();
  const navigate = useNavigate();

  const sa = isAdmin ? upcomingHealthAlerts(health, horses) : [];
  const ss = visibleAlertsForUser(
    pendingSessionAlerts(sessionAlerts),
    isAdmin,
    myTeamMember ? myTeamMember.id : null
  );
  const ov = sa.filter((a) => a.ov);
  const soon = sa.filter((a) => !a.ov);

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">EquiLog</span>
          <h1>Alertas</h1>
        </div>
      </div>
      {!sa.length && !ss.length ? (
        <EmptyState icon="✅">¡Todo al día! Sin alertas pendientes.</EmptyState>
      ) : (
        <>
          {ss.length > 0 && (
            <>
              <h2 style={{ fontSize: ".95rem", color: "var(--az)", marginBottom: ".5rem" }}>
                📝 Partes de sesión pendientes
              </h2>
              {ss.map((s) => {
                const a = activityById(s.act);
                const m = s.pid ? team.find((x) => x.id === s.pid) : null;
                return (
                  <div className="sal" key={s.id}>
                    <span className="ico">{a.i}</span>
                    <div className="txt">
                      {s.hn} — {a.l}
                      <span>
                        {fD(s.date)}
                        {m ? " · " + m.name : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn bts btsm"
                      onClick={() => navigate(`/alerts/${s.id}/answer`)}
                    >
                      Rellenar →
                    </button>
                  </div>
                );
              })}
            </>
          )}
          {ov.length > 0 && (
            <>
              <h2 style={{ fontSize: ".95rem", color: "var(--ro)", margin: ".85rem 0 .5rem" }}>⚠️ Vencidos</h2>
              {ov.map((a, i) => (
                <AlertCard key={i} alert={a} />
              ))}
            </>
          )}
          {soon.length > 0 && (
            <>
              <h2 style={{ fontSize: ".95rem", color: "var(--am)", margin: ".85rem 0 .5rem" }}>
                🔔 Próximos 14 días
              </h2>
              {soon.map((a, i) => (
                <AlertCard key={i} alert={a} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
