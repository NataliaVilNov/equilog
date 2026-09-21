import { fD } from "../../lib/date.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useStableData } from "../../hooks/useStableData.js";

// Ports healthDocCategoryLabel/healthDocIcon/fileSizeLabel (public/legacy-app.js:1054-1068)
// and healthDocCard (public/legacy-app.js:1072-1088).
function healthDocCategoryLabel(cat) {
  const map = {
    precompra: "Informe precompra",
    veterinario: "Informe veterinario",
    xrays: "X-rays / Radiografías",
    analitica: "Analítica / Pruebas",
    foto: "Fotos lesión",
    otro: "Otro",
  };
  return map[cat] || "Documento";
}

function healthDocIcon(d) {
  const name = (d.name || "").toLowerCase();
  const type = (d.type || "").toLowerCase();
  const cat = (d.category || "").toLowerCase();
  if (cat === "xrays" || name.includes("xray") || name.includes("rx") || name.includes("radiograf")) return "🩻";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "📄";
  if (type.includes("image") || /\.(jpg|jpeg|png|webp|heic)$/i.test(name)) return "🖼️";
  if (name.endsWith(".zip")) return "🗂️";
  return "📎";
}

function fileSizeLabel(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

export function HealthDocCard({ doc }) {
  const { can } = usePermissions();
  const { deleteHealthDoc } = useStableData();
  const canDel = can("deleteItems") || can("health");
  const sourceLabel = doc.source === "link" ? "Enlace externo" : "Archivo subido";
  const meta = [
    healthDocCategoryLabel(doc.category),
    doc.date ? fD(doc.date) : "",
    sourceLabel,
    doc.size ? fileSizeLabel(doc.size) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  function handleDelete() {
    if (!window.confirm("¿Eliminar este documento sanitario?")) return;
    deleteHealthDoc(doc.id);
  }

  return (
    <div className="xc" style={{ alignItems: "center" }}>
      <div className="xi otro">{healthDocIcon(doc)}</div>
      <div className="xinf">
        <div className="xl">{doc.title || doc.name || "Documento"}</div>
        <div className="xm">{meta}</div>
        {doc.notes && (
          <div className="xm" style={{ marginTop: ".12rem" }}>
            {doc.notes}
          </div>
        )}
      </div>
      <div className="ca" style={{ gap: ".25rem" }}>
        {doc.url && (
          <a className="btn btsm btaz" href={doc.url} target="_blank" rel="noopener">
            Ver
          </a>
        )}
        {canDel && (
          <button className="db" onClick={handleDelete}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
