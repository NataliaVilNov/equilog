import { useNavigate } from "react-router-dom";
import { healthTypeById } from "../../lib/constants.js";
import { fD } from "../../lib/date.js";

// Ports scard (public/legacy-app.js:2374-2381). Also reused by HomePage (Phase 4c).
export function AlertCard({ alert }) {
  const navigate = useNavigate();
  const ht = healthTypeById(alert.type);
  const dt = alert.ov
    ? `Vencido hace ${Math.abs(alert.days)}d`
    : `En ${alert.days} día${alert.days === 1 ? "" : "s"}`;

  return (
    <div className="xc" style={{ cursor: "pointer" }} onClick={() => navigate(`/horses/${alert.hid}?tab=salud`)}>
      <div className={"xi " + alert.type}>{ht.i}</div>
      <div className="xinf">
        <div className="xl">
          {alert.hn} · {alert.label}
        </div>
        <div className="xm">
          {dt} · {fD(alert.nxt)}
        </div>
      </div>
    </div>
  );
}
