import { useNavigate } from "react-router-dom";
import { healthTypeById } from "../../lib/constants.js";
import { fD, dU } from "../../lib/date.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useStableData } from "../../hooks/useStableData.js";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Ports the health-record row in rHorse's "salud" tab (public/legacy-app.js:1756-1765).
export function HealthRecordCard({ record, horseId }) {
  const { can } = usePermissions();
  const { deleteHealthRecord } = useStableData();
  const navigate = useNavigate();
  const ht = healthTypeById(record.type);

  let dueBadge = null;
  if (record.nxt) {
    const d = dU(record.nxt);
    if (d < 0) dueBadge = <span className="ap ov">⚠️ Vencido hace {Math.abs(d)}d</span>;
    else if (d <= 14)
      dueBadge = (
        <span className="ap">
          🔔 En {d}d ({fD(record.nxt)})
        </span>
      );
    else dueBadge = <span className="ap ok">✓ {fD(record.nxt)}</span>;
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteHealthRecord(record.id);
  }

  return (
    <div className="xc">
      <div className={"xi " + record.type}>{ht.i}</div>
      <div className="xinf">
        <div className="xl">{record.label || ht.l}</div>
        <div className="xm">
          {fD(record.date)}
          {record.notes ? " · " + record.notes : ""}
        </div>
        {record.amount ? (
          <div className="xm" style={{ marginTop: ".15rem" }}>
            💰 {Number(record.amount).toFixed(2)}€{" "}
            <span className={"sb s-" + (record.payStatus || "pendiente")} style={{ marginLeft: ".3rem" }}>
              {capitalize(record.payStatus || "pendiente")}
            </span>
            {record.payee ? " · " + record.payee : ""}
          </div>
        ) : null}
        {dueBadge && <div className="xn">{dueBadge}</div>}
      </div>
      <div className="ca">
        <button className="ib" onClick={() => navigate(`/horses/${horseId}/health/${record.id}/edit`)}>
          ✏️
        </button>
        {can("deleteItems") && (
          <button className="db" onClick={handleDelete}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
