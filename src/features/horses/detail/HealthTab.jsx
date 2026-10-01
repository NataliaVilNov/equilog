import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { HealthDocUploader } from "../../health/HealthDocUploader.jsx";
import { HealthDocCard } from "../../health/HealthDocCard.jsx";
import { HealthRecordCard } from "../../health/HealthRecordCard.jsx";

// Ports the "salud" tab body of rHorse (public/legacy-app.js:1715-1766).
export function HealthTab({ horse }) {
  const { health, healthDocs } = useStableData();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const hdocs = useMemo(
    () =>
      (healthDocs || [])
        .filter((d) => d.hid === horse.id)
        .sort((a, b) => ((a.date || a.createdAt || "") < (b.date || b.createdAt || "") ? 1 : -1)),
    [healthDocs, horse.id]
  );
  const he = useMemo(
    () => health.filter((r) => r.hid === horse.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [health, horse.id]
  );

  return (
    <>
      <div className="card" style={{ padding: ".85rem", marginBottom: ".9rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: ".6rem",
            marginBottom: ".65rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: ".72rem",
                fontWeight: 800,
                color: "var(--vd)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              📁 Documentos sanitarios
            </div>
            <div style={{ fontSize: ".72rem", color: "var(--gr)", marginTop: ".12rem" }}>
              Informes precompra, veterinario, radiografías, analíticas, fotos o PDFs.
            </div>
          </div>
        </div>
        {can("health") && <HealthDocUploader hid={horse.id} />}
        {hdocs.length ? (
          hdocs.map((d) => <HealthDocCard key={d.id} doc={d} />)
        ) : (
          <div className="em" style={{ padding: "1.1rem .4rem" }}>
            <p>Sin documentos sanitarios todavía.</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: ".8rem" }}>
        {can("health") && (
          <button className="btn bts btbl" onClick={() => navigate(`/horses/${horse.id}/health/new`)}>
            + Añadir registro sanitario
          </button>
        )}
      </div>
      {!he.length ? (
        <EmptyState>Sin registros sanitarios.</EmptyState>
      ) : (
        he.map((r) => <HealthRecordCard key={r.id} record={r} horseId={horse.id} />)
      )}
    </>
  );
}
