import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { healthTypeById } from "../../lib/constants.js";
import { healthAlerts, alertText } from "../../lib/healthCycles.js";

// Cuántos avisos se listan antes de resumir el resto en una línea.
const MAX_SHOWN = 5;

// Qué cuidados están pendientes en toda la cuadra, calculado al vuelo desde el histórico de
// salud: nada de esto se guarda en Firestore. Lo que no tiene fecha `nxt` apuntada se estima
// con el ciclo del tipo (ver lib/healthCycles.js), así que también avisa de lo que a nadie se
// le ocurrió programar — que es justo lo que se olvida.
export function HealthAlertsCard() {
  const navigate = useNavigate();
  const { horses, health } = useStableData();
  const { can } = usePermissions();

  const alerts = useMemo(() => healthAlerts(horses, health), [horses, health]);

  if (!can("health")) return null;

  const due = alerts.filter((a) => !a.never);
  const never = alerts.filter((a) => a.never);

  // Una cuadra sin histórico no puede calcular nada: mejor decirlo que fingir que va todo bien.
  if (!due.length) {
    if (never.length >= (horses.length || 1) * 2) {
      return (
                  <button
            type="button"
            className="empty-soft"
            style={{ marginBottom: "1rem", width: "100%", textAlign: "left", border: 0 }}
            onClick={() => navigate("/health-seed")}
          >
            <span>🩺</span>
            <div>
              <b>Aún no puedo avisarte de nada</b>
              <p>
                Apunta la última vez que herraste, vacunaste o desparasitaste a cada caballo y
                empezaré a avisarte cuando toque repetirlo. Pulsa para rellenarlo de una vez.
              </p>
            </div>
          </button>
      );
    }
    return null;
  }

  const shown = due.slice(0, MAX_SHOWN);
  const overdue = due.filter((a) => a.overdue).length;

  return (
    <section className="health-alerts">
      <div className="health-alerts-head">
        <b>Cuidados pendientes</b>
        <small>
          {overdue > 0
            ? `${overdue} atrasado${overdue !== 1 ? "s" : ""} de ${due.length}`
            : `${due.length} próximo${due.length !== 1 ? "s" : ""}`}
        </small>
      </div>

      {shown.map((a) => {
        const type = healthTypeById(a.type);
        return (
          <button
            key={a.hid + a.type}
            type="button"
            className={"health-alert-row" + (a.overdue ? " is-overdue" : "")}
            onClick={() => navigate(`/horses/${a.hid}?tab=salud`)}
          >
            <span className="health-alert-icon">{type.i}</span>
            <div>
              <b>
                {a.horseName} · {type.l}
              </b>
              <small>{alertText(a)}</small>
            </div>
            <span className="health-alert-arrow">›</span>
          </button>
        );
      })}

      {due.length > shown.length && (
        <small className="health-alerts-more">y {due.length - shown.length} más</small>
      )}
    </section>
  );
}