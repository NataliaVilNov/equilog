import { useContext, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";

const DOC_CATEGORIES = [
  { id: "precompra", label: "Informe precompra" },
  { id: "veterinario", label: "Informe veterinario" },
  { id: "xrays", label: "X-rays / Radiografías" },
  { id: "analitica", label: "Analítica / Pruebas" },
  { id: "foto", label: "Fotos lesión" },
  { id: "otro", label: "Otro" },
];

// Ports normalizeExternalUrl (public/legacy-app.js:1110-1115).
function normalizeExternalUrl(url) {
  url = (url || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

// Ports the "add link" and "upload file" forms in the health tab
// (public/legacy-app.js:1724-1750), calling the StableDataContext mutators added alongside
// uploadHealthDocs/addHealthDocLink.
export function HealthDocUploader({ hid }) {
  const { user } = useContext(AuthContext) || {};
  const { addHealthDocLink, uploadHealthDocs } = useStableData();
  const { showToast } = useToast();

  const [linkCategory, setLinkCategory] = useState("precompra");
  const [linkDate, setLinkDate] = useState(td());
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  const [uploadCategory, setUploadCategory] = useState("precompra");
  const [uploadDate, setUploadDate] = useState(td());
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);

  function handleAddLink() {
    const url = normalizeExternalUrl(linkUrl);
    if (!url) {
      showToast("Pega un enlace");
      return;
    }
    addHealthDocLink({
      hid,
      category: linkCategory,
      date: linkDate,
      notes: linkNotes.trim(),
      title: linkTitle.trim() || "Documento enlazado",
      url,
      userId: user && user.uid,
    });
    setLinkTitle("");
    setLinkUrl("");
    setLinkNotes("");
    showToast("Enlace añadido");
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxMb = 25;
    const tooBig = files.find((f) => (f.size || 0) > maxMb * 1024 * 1024);
    if (tooBig) {
      const msg = `El archivo ${tooBig.name} pesa más de ${maxMb} MB. Sube una versión comprimida o un ZIP más pequeño.`;
      showToast(msg);
      setStatus({ text: msg, error: true });
      e.target.value = "";
      return;
    }
    setUploading(true);
    setStatus({ text: "Preparando subida...", error: false });
    showToast(`Subiendo ${files.length} documento(s)...`);
    try {
      const added = await uploadHealthDocs({
        hid,
        files,
        category: uploadCategory,
        date: uploadDate,
        notes: uploadNotes.trim(),
        userId: user && user.uid,
        onProgress: (label, pct) => setStatus({ text: `Subiendo ${label}: ${pct}%`, error: false }),
      });
      setStatus({
        text: `Subida completada: ${added.length} documento(s). Aparecen abajo en Documentos sanitarios.`,
        error: false,
      });
      showToast("Documento(s) subido(s)");
      setUploadNotes("");
    } catch (err) {
      console.error("uploadHealthDocs", err);
      const code = err.code || "";
      let msg = err.message || String(err);
      if (code.includes("storage/unauthorized")) msg = "Permisos insuficientes en Firebase Storage. Revisa las reglas de Storage.";
      if (code.includes("storage/canceled")) msg = "Subida cancelada.";
      if (code.includes("storage/retry-limit-exceeded"))
        msg = "La subida ha tardado demasiado. Prueba con un archivo más pequeño o mejor conexión.";
      setStatus({ text: "Error al subir documento: " + msg, error: true });
      showToast("Error al subir documento");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: ".75rem", marginBottom: ".8rem" }}>
      <div style={{ border: "1px solid var(--li)", borderRadius: "11px", padding: ".75rem", background: "#fff" }}>
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 800,
            color: "var(--vd)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            marginBottom: ".55rem",
          }}
        >
          🔗 Añadir enlace a documento
        </div>
        <div className="r2">
          <div>
            <label>Tipo documento</label>
            <select value={linkCategory} onChange={(e) => setLinkCategory(e.target.value)}>
              {DOC_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Fecha</label>
            <input type="date" value={linkDate} onChange={(e) => setLinkDate(e.target.value)} />
          </div>
        </div>
        <div className="f" style={{ marginTop: ".55rem" }}>
          <label>Título</label>
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Ej: Informe precompra, X-rays menudillo..."
          />
        </div>
        <div className="f">
          <label>Enlace</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Pega enlace de Google Drive, iCloud, Dropbox, OneDrive..."
          />
        </div>
        <div className="f">
          <label>Notas</label>
          <input
            value={linkNotes}
            onChange={(e) => setLinkNotes(e.target.value)}
            placeholder="Ej: placas precompra, informe veterinario, revisión..."
          />
        </div>
        <button type="button" className="btn bts btbl" onClick={handleAddLink}>
          + Guardar enlace
        </button>
        <div style={{ fontSize: ".68rem", color: "var(--gr)", marginTop: ".45rem" }}>
          Para iPhone: comparte el archivo desde Archivos/iCloud/Drive, copia el enlace y pégalo aquí. No usa
          Firebase Storage.
        </div>
      </div>

      <details style={{ border: "1px solid var(--li)", borderRadius: "11px", padding: ".75rem", background: "#fff" }}>
        <summary
          style={{
            fontSize: ".7rem",
            fontWeight: 800,
            color: "var(--vd)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            cursor: "pointer",
          }}
        >
          📤 Subir archivo a Firebase Storage opcional
        </summary>
        <div style={{ display: "grid", gap: ".55rem", marginTop: ".7rem" }}>
          <div className="r2">
            <div>
              <label>Tipo documento</label>
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {DOC_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Fecha</label>
              <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label>Notas</label>
            <input
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="Ej: placas precompra, informe menudillo, revisión veterinaria..."
            />
          </div>
          <label className="btn btg btbl" style={{ margin: 0 }}>
            + Subir documentos
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.zip,.dcm,image/*,application/pdf"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
          <div style={{ fontSize: ".68rem", color: "var(--gr)" }}>
            Esta opción usa Firebase Storage y puede generar coste. Si quieres evitarlo, usa el enlace externo de
            arriba.
          </div>
          {status && (
            <div
              style={{
                fontSize: ".72rem",
                fontWeight: 700,
                marginTop: ".15rem",
                color: status.error ? "var(--ro)" : "var(--v)",
              }}
            >
              {status.text}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
