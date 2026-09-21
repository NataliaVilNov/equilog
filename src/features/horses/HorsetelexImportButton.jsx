import { useState } from "react";
import { extractHorsetelexFromHtml, applyPedigree } from "./horsetelexParser.js";

// Ports fetchHorsetelexHtml (public/legacy-app.js:2603-2622).
async function fetchHorsetelexHtml(url, onStatus) {
  const clean = url.replace(/^http:\/\//, "https://");
  const proxied = [
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(clean),
    "https://corsproxy.io/?" + encodeURIComponent(clean),
    "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(clean),
  ];
  let lastErr = null;
  for (let i = 0; i < proxied.length; i++) {
    try {
      onStatus("🔄 Leyendo Horsetelex... intento " + (i + 1) + "/" + proxied.length);
      const r = await fetch(proxied[i], { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const tx = await r.text();
      if (!tx || tx.length < 400) throw new Error("Respuesta vacía");
      return tx;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo conectar");
}

// Ports importHorsetelex/manualHorsetelexPaste (public/legacy-app.js:2576-2636).
// `current` is the in-progress form state, used by applyPedigree to decide which
// fields are safe to overwrite (same "don't clobber a filled field" rule as legacy).
export function HorsetelexImportButton({ url, current, onImport }) {
  const [status, setStatus] = useState(null);
  const [importing, setImporting] = useState(false);

  function applyAndReport(ped) {
    const { updates, success } = applyPedigree(ped, current);
    if (success) {
      onImport(updates);
      setStatus({
        text: "✅ Pedigree importado. Revisa los campos y pulsa Guardar caballo.",
        color: "var(--v)",
      });
    } else {
      setStatus({
        text: '⚠️ No he podido identificar padre/madre. Usa "Pegar texto/HTML" y pega el bloque de pedigree de Horsetelex.',
        color: "var(--am)",
      });
    }
  }

  async function handleImport() {
    if (!url || !url.toLowerCase().includes("horsetelex")) {
      setStatus({ text: "Pega primero el enlace de Horsetelex", color: "var(--gr)" });
      return;
    }
    setImporting(true);
    setStatus({ text: "🔄 Conectando con Horsetelex...", color: "var(--gr)" });
    try {
      const html = await fetchHorsetelexHtml(url, (text) => setStatus({ text, color: "var(--gr)" }));
      const ped = extractHorsetelexFromHtml(html);
      applyAndReport(ped);
    } catch (e) {
      setStatus({
        text: '❌ No se pudo leer automáticamente el enlace. Pulsa "Pegar texto/HTML" y pega el pedigree copiado de Horsetelex.',
        color: "var(--ro)",
      });
      console.error("Horsetelex import error:", e);
    }
    setImporting(false);
  }

  function handleManualPaste() {
    const pasted = window.prompt(
      "Pega aquí el texto o HTML del pedigree de Horsetelex. Puedes seleccionar la zona del pedigree en la web, copiar y pegar aquí."
    );
    if (!pasted) return;
    const ped = extractHorsetelexFromHtml(pasted);
    applyAndReport(ped);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginTop: ".5rem" }}>
        {url && url.toLowerCase().includes("horsetelex") && (
          <button type="button" className="btn btsm" onClick={handleImport} disabled={importing}>
            🔄 Importar pedigree
          </button>
        )}
        <button type="button" className="btn btg btsm" onClick={handleManualPaste}>
          🧬 Pegar texto/HTML
        </button>
      </div>
      {status && (
        <div style={{ fontSize: ".75rem", color: status.color, marginTop: ".3rem" }}>{status.text}</div>
      )}
    </div>
  );
}
