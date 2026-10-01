import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions.js";
import { canViewHorseInfo } from "./horseAccess.js";

// Ports one horse row from rList (public/legacy-app.js:1555-1571). The per-horse alert
// badge is left out — it depends on the Alerts feature (Phase 4), not yet ported.
export function HorseListItem({ horse, trainingCount }) {
  const { isAdmin, uid } = usePermissions();
  const navigate = useNavigate();
  const authorized = canViewHorseInfo(horse, isAdmin, uid);
  const owners =
    horse.owners && horse.owners.length
      ? horse.owners
      : horse.owner
      ? [{ nombre: horse.owner, pct: 100 }]
      : [];
  const subtitle = !authorized
    ? ""
    : owners.length
    ? "Prop.: " +
      owners.map((o) => (o.nombre || "") + (owners.length > 1 ? " " + o.pct + "%" : "")).join(" · ")
    : horse.breed || "";

  return (
    <button className="hc" onClick={() => navigate(`/horses/${horse.id}?tab=entrenos`)}>
      <div className="hp">{horse.photo ? <img src={horse.photo.url} alt="" /> : "🐴"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 600,
            fontSize: "1.05rem",
            color: "var(--ti)",
          }}
        >
          {horse.name}
        </div>
        <div style={{ fontSize: ".76rem", color: "var(--gr)" }}>{subtitle}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--v)",
          }}
        >
          {trainingCount}
        </div>
        <div style={{ fontSize: ".58rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gr)" }}>
          Sesiones
        </div>
      </div>
    </button>
  );
}
