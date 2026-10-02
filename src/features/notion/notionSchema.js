import { healthTypeById } from "../../lib/constants.js";
import { boardActivity } from "../boards/boardHelpers.js";

// The single Notion database EquiLog writes to and how each EquiLog record becomes a page of
// it. Everything here is pure (no fetch, no Firestore), so it is unit-tested directly.
//
// Property names are Spanish and reuse the reference "pizarra semanal" app's (Registro, Fecha,
// Tipo, Informe / diagnóstico → here "Informe / notas") so people coming from it recognise them.
export const TIPO_OPTIONS = ["Veterinario", "Vacuna", "Herraje", "Desparasitación", "Otro", "Plan semanal"];

const HEALTH_TIPO = { herraje: "Herraje", vacuna: "Vacuna", despar: "Desparasitación", otro: "Otro" };
const RICH_TEXT_LIMIT = 2000; // Notion's per-text-object limit

// `properties` payload for creating the database (initial_data_source).
export function databaseProperties() {
  return {
    Registro: { title: {} },
    Fecha: { date: {} },
    Tipo: { select: { options: TIPO_OPTIONS.map((name) => ({ name })) } },
    Caballo: { select: {} },
    "Informe / notas": { rich_text: {} },
    "Próxima revisión": { date: {} },
    Importe: { number: { format: "euro" } },
    Pago: { select: {} },
    Actividades: { multi_select: {} },
    "EquiLog ID": { rich_text: {} },
  };
}

// --- Notion property value helpers ---------------------------------------------------------
const text = (v) => [{ type: "text", text: { content: String(v || "").slice(0, RICH_TEXT_LIMIT) } }];
const title = (v) => ({ title: text(v) });
const richText = (v) => ({ rich_text: v ? text(v) : [] });
const date = (v) => ({ date: v ? { start: v } : null });
// Select/multi-select option names can't contain commas.
const optionName = (v) => String(v).replace(/,/g, " ").trim().slice(0, 100);
const select = (v) => ({ select: v ? { name: optionName(v) } : null });
const multiSelect = (list) => ({ multi_select: list.map((name) => ({ name: optionName(name) })) });
const number = (n) => ({ number: Number.isFinite(n) && n > 0 ? n : null });

// Stable serialisation (sorted keys) → short FNV-1a hash. Used to tell "this page already
// matches what is in Notion" from "needs a PATCH" without storing the whole payload.
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

export function hashProperties(properties) {
  const str = stableStringify(properties);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// --- Record → page -------------------------------------------------------------------------
// Each builder returns { key, kind, hid, date, properties, hash }. `key` is the dedupe key
// stored in the page's "EquiLog ID" property and as the id of its notionLinks doc.
function finish(key, kind, hid, dateStr, properties) {
  return { key, kind, hid, date: dateStr || "", properties, hash: hashProperties(properties) };
}

export const healthKey = (id) => `health__${id}`;
export const planKey = (hid, dateStr) => `plan__${hid}__${dateStr}`;

// A health record. `isVet` marks one a weekly-board cell points at through vetHealthId — the
// board's "VET second tap" flow writes exactly such a record, which is what the reference
// app pushed to Notion as its one synced item.
export function buildHealthPage({ record, horse, isVet = false }) {
  const key = healthKey(record.id);
  const label = record.label || healthTypeById(record.type).l;
  const amount = Number(record.amount);
  const properties = {
    Registro: title(`${horse.name} · ${label}`),
    Fecha: date(record.date),
    Tipo: select(isVet ? "Veterinario" : HEALTH_TIPO[record.type] || "Otro"),
    Caballo: select(horse.name),
    "Informe / notas": richText(record.notes),
    "Próxima revisión": date(record.nxt),
    Importe: number(amount),
    Pago: select(amount > 0 ? (record.payStatus === "pagado" ? "Pagado" : "Pendiente") : null),
    "EquiLog ID": richText(key),
  };
  return finish(key, "health", record.hid, record.date, properties);
}

// One weekly-board cell (horse + day). null when the cell has nothing to say.
export function buildPlanPage({ plan, horse, activities }) {
  const acts = (plan.activities || []).map((id) => boardActivity(activities, id).label);
  const done = (plan.completed || []).map((id) => boardActivity(activities, id).label);
  if (!acts.length && !plan.note) return null;
  const key = planKey(plan.hid, plan.date);
  const notes = [plan.note, done.length ? `Hecho: ${done.join(", ")}` : ""].filter(Boolean).join("\n");
  const properties = {
    Registro: title(`${horse.name} · Plan semanal`),
    Fecha: date(plan.date),
    Tipo: select("Plan semanal"),
    Caballo: select(horse.name),
    Actividades: multiSelect(acts),
    "Informe / notas": richText(notes),
    "EquiLog ID": richText(key),
  };
  return finish(key, "plan", plan.hid, plan.date, properties);
}

// The 32-hex id at the end of a Notion page link (or a bare id), as the dashed UUID the API
// wants. null if there is none.
export function parseNotionPageId(input) {
  const str = String(input || "").trim();
  const dashed = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const hex = dashed ? dashed[0].replace(/-/g, "") : (str.split(/[?#]/)[0].match(/([0-9a-f]{32})\/?$/i) || [])[1];
  if (!hex) return null;
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
