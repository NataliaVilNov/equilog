import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { useTaskOccurrences } from "../../hooks/useTaskOccurrences.js";
import { td, fD } from "../../lib/date.js";
import { workTypeById, activityById } from "../../lib/constants.js";

const REPORT_TYPES = [
  { id: "diario", label: "Diario", icon: "📅" },
  { id: "semanal", label: "Semanal", icon: "📆" },
  { id: "finde", label: "Fin de semana", icon: "🌅" },
];

function defaultRange() {
  const e = td();
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return { s: d.toISOString().slice(0, 10), e };
}

// Ports rTR/genTR (public/legacy-app.js:3444-3486). genTR's direct client-side Anthropic
// fetch call is ported exactly as legacy has it (no API key, same request shape) — see
// docs/components/reports.md for why this isn't silently "fixed" here.
export function TeamReportPage() {
  const { stableId, horses, trainings, tasks } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const initialRange = defaultRange();
  const [start, setStart] = useState(initialRange.s);
  const [end, setEnd] = useState(initialRange.e);
  const [reportType, setReportType] = useState("diario");
  const [generating, setGenerating] = useState(false);
  const [reportText, setReportText] = useState(null);
  const [error, setError] = useState(false);

  const occRows = useTaskOccurrences(stableId, tasks, start, end);

  async function handleGenerate() {
    setGenerating(true);
    setError(false);
    setReportText(null);
    const lines = [];
    horses.forEach((h) => {
      const tr = trainings.filter((t) => t.hid === h.id && t.date >= start && t.date <= end);
      const tk = occRows.filter((t) => t.horseId === h.id && t.status === "done");
      if (!tr.length && !tk.length) return;
      lines.push(`\n=== ${h.name}${h.owner ? " (" + h.owner + ")" : ""} ===`);
      tr.forEach((t) =>
        lines.push(`- ${fD(t.date)} | ${workTypeById(t.wtype).l} | ${t.dur}min | ${t.rating}/10${t.feel ? " | " + t.feel : ""}`)
      );
      tk.forEach((t) =>
        lines.push(`- ${fD(t.occurrenceDate || t.startDate)} | ${activityById(t.activity).l} ✓${t.notes ? " | " + t.notes : ""}`)
      );
    });
    const typeLabel = { diario: "diario", semanal: "semanal", finde: "del fin de semana" }[reportType] || "del periodo";
    const prompt = `Eres el jefe de cuadra. Genera un informe ${typeLabel} del ${fD(start)} al ${fD(end)}.\n\nActividad:\n${
      lines.join("\n") || "(Sin actividad)"
    }\n\nResumen del trabajo, incidencias, estado del equipo, próximos pasos. Tono directo, apto para WhatsApp.\n\n**Resumen general**\n**Trabajo por caballo**\n**Incidencias**\n**Estado del equipo**\n**Próximos pasos**\n\nSolo el informe.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await r.json();
      const text = (d.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      if (!text) throw new Error("vacío");
      setReportText(text);
    } catch (_e) {
      setError(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportText || "");
      showToast("Copiado");
    } catch (_e) {
      // ignore
    }
  }

  function handleWhatsApp() {
    window.open("https://wa.me/?text=" + encodeURIComponent(reportText || ""));
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/team")}>
          ←
        </button>
        <h1>Informe de equipo</h1>
      </div>
      <div className="card">
        <div className="r2">
          <div className="f">
            <label>Desde</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="f">
            <label>Hasta</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="f">
          <label>Tipo</label>
          <div className="og og3">
            {REPORT_TYPES.map((r) => (
              <div
                key={r.id}
                className={"oo" + (reportType === r.id ? " active" : "")}
                onClick={() => setReportType(r.id)}
              >
                <span className="ic">{r.icon}</span>
                {r.label}
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="btn bts btbl" onClick={handleGenerate} disabled={generating}>
          Generar informe
        </button>
      </div>
      <div id="tr-out">
        {generating && (
          <div className="ld">
            <div className="sp"></div>
            <p>Generando...</p>
          </div>
        )}
        {!generating && error && (
          <div className="em">
            <p style={{ color: "var(--ro)" }}>Error.</p>
          </div>
        )}
        {!generating && reportText && (
          <>
            <div className="rpb">
              {reportText.split("\n").map((line, i) => {
                const t = line.trim();
                if (!t) return <br key={i} />;
                if (t.startsWith("**") && t.endsWith("**")) return <h3 key={i}>{t.replace(/\*\*/g, "")}</h3>;
                return <p key={i}>{t}</p>;
              })}
            </div>
            <div className="rpa">
              <button type="button" className="btn btg" onClick={handleCopy}>
                📋 Copiar
              </button>
              <button type="button" className="btn btaz" onClick={handleWhatsApp}>
                💬 WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
