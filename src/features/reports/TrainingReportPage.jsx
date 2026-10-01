import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { td, fD } from "../../lib/date.js";
import { workTypeById } from "../../lib/constants.js";
import { exportTrainingReportPdf } from "./pdfExport.js";

function defaultRange() {
  const e = td();
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return { s: d.toISOString().slice(0, 10), e };
}

// Ports rRep/genRep (public/legacy-app.js:2154-2189). genRep's direct client-side Anthropic
// fetch call is ported exactly as legacy has it — no API key, same request shape — rather
// than either silently fixing it (a real security decision, not a refactor) or cutting the
// feature. It will fail the same way it already fails in production; this is parity, and
// docs/BACKLOG.md #2 already documents the real fix (a server-side proxy) as a follow-up
// outside this migration's scope. See also docs/components/team.md for the shared reasoning
// (TeamReportPage's genTR has the same pattern).
export function TrainingReportPage() {
  const { hid } = useParams();
  const { horses, trainings } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const horse = horses.find((h) => h.id === hid);
  const initialRange = defaultRange();
  const [start, setStart] = useState(initialRange.s);
  const [end, setEnd] = useState(initialRange.e);
  const [generating, setGenerating] = useState(false);
  const [reportText, setReportText] = useState(null);
  const [error, setError] = useState(false);

  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  const sessions = trainings.filter((t) => t.hid === hid && t.date >= start && t.date <= end);

  async function handleGenerate() {
    setGenerating(true);
    setError(false);
    setReportText(null);
    const tr = trainings.filter((t) => t.hid === hid && t.date >= start && t.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
    const lines = tr
      .map(
        (t) =>
          `- ${fD(t.date)} | ${workTypeById(t.wtype).l} | ${t.dur}min | ${t.rating}/10${t.state ? " | " + t.state : ""}${
            t.feel ? " | " + t.feel : ""
          }${t.notes ? " | " + t.notes : ""}`
      )
      .join("\n");
    const prompt = `Eres un entrenador profesional. Analiza los entrenamientos de "${horse.name}"${
      horse.owner ? ", propiedad de " + horse.owner : ""
    } del ${fD(start)} al ${fD(end)} (${tr.length} sesiones) y redacta un informe profesional en español para el propietario.\n${
      tr.length ? "\nRegistros:\n" + lines : "\n(Sin sesiones)"
    }\n\nINSTRUCCIONES: NO copies datos literalmente. Analiza patrones, tendencias, evolución. Tono profesional y cercano.\n**Valoración general**\n**Análisis del trabajo**\n**Evolución y tendencias**\n**Aspectos destacados**\n**Recomendaciones**\n**Conclusión**\nSolo el informe.`;
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

  function handleExportPdf() {
    if (!reportText) {
      showToast("Genera el informe primero");
      return;
    }
    exportTrainingReportPdf(horse, reportText, { s: start, e: end });
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(`/horses/${hid}?tab=entrenos`)}>
          ←
        </button>
        <h1>Informe · {horse.name}</h1>
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
        <p style={{ fontSize: ".76rem", color: "var(--gr)", marginBottom: ".75rem" }}>{sessions.length} sesión(es)</p>
        <button type="button" className="btn bts btbl" onClick={handleGenerate} disabled={generating}>
          Generar informe con IA
        </button>
      </div>
      <div id="rep-out">
        {generating && (
          <div className="ld">
            <div className="sp"></div>
            <p>Analizando con IA...</p>
          </div>
        )}
        {!generating && error && (
          <div className="em">
            <p style={{ color: "var(--ro)" }}>Error. Inténtalo de nuevo.</p>
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
              <button type="button" className="btn bts" onClick={handleExportPdf}>
                ⬇ PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
