// Reads a horse's data out of a Horsetelex page the user copied from their own browser.
//
// Horsetelex is an Angular Universal app behind a Cloudflare bot challenge, so EquiLog never
// fetches it (no proxy, no server). Instead the user pastes the page's source (Ctrl+U, then
// select-all/copy) — or a bookmarklet hands over the same thing from their open tab (see
// horsetelexBookmarklet.js). The server-rendered HTML carries Angular's "transfer state": a
// <script id="serverApp-state"> holding the JSON of every API call the page made, including
// the horse's whole family tree (names, birth year, studbook, breeder…). Reading that is far
// sturdier than scraping the rendered markup, and it is pure string/JSON work, so this module
// has no DOM dependency and runs in Node (tests) as well as the browser.

const STATE_SCRIPT_RE = /<script[^>]*\bid=["']serverApp-state["'][^>]*>([\s\S]*?)<\/script>/i;
const FAMILY_TREE_KEY_RE = /\/pedigrees\/family-tree(?:$|[?#])/;

// Angular's TransferState escapes these five characters inside the script body.
const TRANSFER_STATE_ESCAPES = { q: '"', a: "&", s: "'", l: "<", g: ">" };

function unescapeTransferState(s) {
  return s.replace(/&([qaslg]);/g, (_, c) => TRANSFER_STATE_ESCAPES[c]);
}

// The transfer-state JSON from whatever the user pasted: a full page source, just the
// <script> element, or just its text content (what a bookmarklet reads).
function readTransferState(text) {
  const src = String(text || "");
  const m = src.match(STATE_SCRIPT_RE);
  const body = m ? m[1] : src.trim();
  if (!/^\{\s*(&q;|")/.test(body)) return null;
  try {
    return JSON.parse(unescapeTransferState(body));
  } catch (_err) {
    return null;
  }
}

function familyTreeEntry(state) {
  const key = Object.keys(state).find((k) => FAMILY_TREE_KEY_RE.test(k));
  if (!key) return null;
  let entry = state[key];
  if (typeof entry === "string") {
    try {
      entry = JSON.parse(entry);
    } catch (_err) {
      return null;
    }
  }
  const value = entry && (entry.value || entry);
  return value && value.pedigree ? value.pedigree : null;
}

function nameOf(horse) {
  return horse && typeof horse.name === "string" ? horse.name.trim() : "";
}

export function horsetelexSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Returns null when `text` isn't a Horsetelex horse page source (or has no pedigree in it);
// otherwise the horse's data. Fields Horsetelex doesn't give are "" (never undefined).
export function parseHorsetelexSource(text) {
  const state = readTransferState(text);
  const horse = state && familyTreeEntry(state);
  if (!horse || !nameOf(horse)) return null;

  const sire = horse.father;
  const dam = horse.mother;
  const foaldate = typeof horse.foaldate === "string" ? horse.foaldate.slice(0, 10) : "";
  const slug = horsetelexSlug(horse.name);

  return {
    horseName: nameOf(horse),
    breed: (horse.studbook && horse.studbook.shortname) || "",
    // Horsetelex normally only gives the birth year; a full date only when a foal date exists.
    dob: /^\d{4}-\d{2}-\d{2}$/.test(foaldate) ? foaldate : "",
    birthYear: horse.year ? String(horse.year) : "",
    origin: typeof horse.breeder === "string" ? horse.breeder.trim() : "",
    horsetelexUrl: horse.id ? `https://www.horsetelex.com/horses/pedigree/${horse.id}${slug ? "/" + slug : ""}` : "",
    sire: nameOf(sire),
    dam: nameOf(dam),
    gsire: nameOf(sire && sire.father),
    gdam: nameOf(sire && sire.mother),
    mgsire: nameOf(dam && dam.father),
    mgdam: nameOf(dam && dam.mother),
  };
}

const PEDIGREE_KEYS = ["sire", "dam", "gsire", "gdam", "mgsire", "mgdam"];
const SCALAR_KEYS = [
  ["horseName", "name"],
  ["breed", "breed"],
  ["dob", "dob"],
  ["origin", "origin"],
  ["horsetelexUrl", "horsetelex"],
];

// Which horse-form fields an import would change. The six pedigree names are always taken
// (that is what the import is for); name/breed/dob/origin/link only fill an empty field unless
// `overwrite` is set, so re-importing never clobbers something the user typed. Pure: the form
// applies the result to its own state, nothing is saved until "Guardar caballo".
export function buildHorsetelexUpdates(parsed, current, { overwrite = false } = {}) {
  const updates = {};
  if (!parsed) return updates;
  PEDIGREE_KEYS.forEach((key) => {
    if (parsed[key]) updates[key] = parsed[key];
  });
  SCALAR_KEYS.forEach(([from, to]) => {
    if (parsed[from] && (overwrite || !(current && current[to]))) updates[to] = parsed[from];
  });
  return updates;
}
