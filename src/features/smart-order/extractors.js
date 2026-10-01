import { td, addD } from "../../lib/date.js";
import { normTxt } from "./matching.js";

// Ports soDateFromText/soDuration/soAmount/soActivities/soHealth/soClauseActivity
// (public/legacy-app.js:2751-2778,2915-2955): the keyword/regex field extractors that pull
// a date, duration, amount, and activity/health type out of one clause's text.

export function soDateFromText(txt, def) {
  const t = normTxt(txt);
  const d = def || td();
  if (t.includes("pasado manana")) return addD(td(), 2);
  if (t.includes("manana")) return addD(td(), 1);
  if (t.includes("ayer")) return addD(td(), -1);
  if (t.includes("hoy")) return td();
  const days = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };
  for (const k in days) {
    if (t.includes(k)) {
      const now = new Date();
      const cur = now.getDay();
      let diff = (days[k] - cur + 7) % 7;
      if (diff === 0) diff = 7;
      return addD(td(), diff);
    }
  }
  return d;
}

export function soDuration(txt) {
  const t = normTxt(txt);
  let m = t.match(/(\d{1,3})\s*(min|minutos|m)\b/);
  if (m) return Number(m[1]);
  m = t.match(/(\d{1,2})\s*(h|hora|horas)\b/);
  if (m) return Number(m[1]) * 60;
  if (t.includes("media hora")) return 30;
  if (t.includes("un cuarto")) return 15;
  if (t.includes("suave") || t.includes("corto")) return 30;
  return null;
}

export function soAmount(txt) {
  const raw = (txt || "").toString();
  let m = raw.match(/(\d+(?:[.,]\d{1,2})?)\s*(€|eur|euros)/i);
  if (m) return Number(m[1].replace(",", "."));
  const t = normTxt(raw);
  m = t.match(/(?:coste|costo|costo|vale|valio|precio|factura|cobro|cobro la veterinaria|cobro el veterinario)\s*(de\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (m) return Number(m[2].replace(",", "."));
  m = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(eur|euros)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

export function soActivities(seg) {
  const t = normTxt(seg);
  const a = [];
  const add = (id, label, notes) => {
    if (!a.some((x) => x.activity === id && x.label === label)) a.push({ activity: id, label: label || id, notes: notes || "" });
  };
  if (t.includes("paddock") || t.includes("padock")) add("paddock", "Paddock");
  if (t.includes("caminador")) add("caminador", "Caminador");
  if (t.includes("paseo de la mano") || t.includes("pasear de la mano") || t.includes("paseo mano") || t.includes("de la mano") || t.includes("mano"))
    add("paseo_mano", "Paseo de la mano");
  if (t.includes("longe") || t.includes("cuerda") || t.includes("dar cuerda")) add("longe", "Cuerda");
  if (t.includes("salto") || t.includes("saltar") || t.includes("saltado") || t.includes("salta")) add("salto", "Salto");
  if (t.includes("campo")) add("campo", "Campo");
  if (t.includes("doma")) add("doma", "Doma");
  if (t.includes("bano") || t.includes("ducha")) add("bano", "Baño");
  if (t.includes("montar") || t.includes("monte") || t.includes("monta") || t.includes("montarlo") || t.includes("montarla")) {
    if (t.includes("suave") || t.includes("tranquilo") || t.includes("flojo")) add("trabajo_suave", "Montar suave", "Trabajo suave");
    else add("monta", "Monta");
  }
  return a;
}

export function soHealth(seg) {
  const t = normTxt(seg);
  const out = [];
  const add = (type, label) => {
    if (!out.some((x) => x.type === type && x.label === label)) out.push({ type, label });
  };
  if (t.includes("infiltr")) add("otro", "Infiltración");
  if (t.includes("vacun")) add("vacuna", "Vacunación");
  if (t.includes("desparas")) add("despar", "Desparasitación");
  if (t.includes("herraj") || t.includes("herrador")) add("herraje", "Herraje");
  if (t.includes("veterin") || t.includes("revision vet")) add("otro", "Revisión veterinaria");
  if (t.includes("cojer") || t.includes("lesion") || t.includes("menudillo") || t.includes("tendon")) add("otro", "Observación veterinaria");
  return out;
}

// Ports soClauseActivity (public/legacy-app.js:2944-2955): returns every activity detected
// in the clause, falling back to a couple of "ha ido a/llevar al X" phrasings when
// soActivities finds nothing.
export function soClauseActivity(clause) {
  const acts = soActivities(clause);
  if (acts.length) return acts;
  const t = normTxt(clause);
  if (t.includes("ha ido") || t.includes("ir al") || t.includes("llevar al")) {
    if (t.includes("caminador")) return [{ activity: "caminador", label: "Caminador", notes: "" }];
    if (t.includes("paddock") || t.includes("padock")) return [{ activity: "paddock", label: "Paddock", notes: "" }];
  }
  return [];
}
