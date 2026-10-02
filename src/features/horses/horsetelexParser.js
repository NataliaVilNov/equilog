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

// Reads the Angular transfer-state JSON out of a pasted page source. null if there is none.
function parseFromSource(text) {
  const state = readTransferState(text);
  const horse = state && familyTreeEntry(state);
  if (!horse || !nameOf(horse)) return null;

  const sire = horse.father;
  const dam = horse.mother;
  const foaldate = typeof horse.foaldate === "string" ? horse.foaldate.slice(0, 10) : "";
  const slug = horsetelexSlug(horse.name);

  return {
    via: "source",
    // The tree comes straight from Horsetelex's data, so an ancestor it doesn't list is
    // genuinely unknown (nothing was lost in copying).
    pedigreeComplete: true,
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

// --- Visible-text route (phones: select-all + copy on the rendered page) -------------------
//
// Horsetelex draws the pedigree as a 4-generation tree. Copied as text, every horse becomes
// "NAME" followed by a "STUDBOOK REG-OR-YEAR" line (e.g. "KWPN 528003198101668", "HOLST 1960",
// "xx BB2261/1540N"), in depth-first order: sire, his sire, that one's sire and dam, his dam,
// … then the dam's branch. The horse itself is the same pair with a "Mare 1986 Dark brown
// 1.64 m" line in between. Nothing in the text says which generation an entry belongs to, so
// the position of an ancestor is only trustworthy when all 14 are present; with fewer, an
// unknown ancestor would silently shift every name after it, so only the horse itself is
// returned and the pedigree is flagged incomplete.
const ANCESTORS_IN_TREE = 14;
// Indexes into the depth-first ancestor list.
const TEXT_POSITIONS = { sire: 0, gsire: 1, gdam: 4, dam: 7, mgsire: 8, mgdam: 11 };

// "<sex or label> 1986 …": any word(s) then a plausible birth year.
const HEADER_LINE_RE = /^\p{L}[\p{L} .'’-]{1,20}?\s+(1[5-9]\d{2}|20\d{2})(?:\s|$)/u;
// "<studbook> <registration or year>": a short code, then a token containing a digit.
const STUDBOOK_LINE_RE = /^([\p{L}.]{1,8})\s+(?=\S*\d)\S+$/u;
const NOT_STUDBOOKS = /^(level|lic|int|test|class|klasse)\.?$/i;
// Every horse name in the copied text is followed by two glued UI words ("ZEOLIET  ProgeniesEdit",
// "NachkommenBearbeiten" in German…). Names are upper case, so a trailing CamelCase token is
// never part of one.
const UI_SUFFIX_RE = /\s+\p{Lu}\p{Ll}+\p{Lu}\p{Ll}+$/u;
const cleanTextName = (line) => line.replace(UI_SUFFIX_RE, "").trim();

function isStudbookLine(line) {
  const m = line && line.match(STUDBOOK_LINE_RE);
  return !!m && !NOT_STUDBOOKS.test(m[1]);
}

function parseFromText(text) {
  const lines = String(text || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  let main = null;
  let next = 0;
  for (let i = 1; i < lines.length - 1; i++) {
    const header = lines[i].match(HEADER_LINE_RE);
    if (header && isStudbookLine(lines[i + 1]) && !isStudbookLine(lines[i - 1])) {
      main = { name: cleanTextName(lines[i - 1]), year: header[1], breed: lines[i + 1].split(" ")[0] };
      next = i + 2;
      break;
    }
  }
  if (!main) return null;

  const ancestors = [];
  for (let j = next; j < lines.length && ancestors.length < ANCESTORS_IN_TREE; j++) {
    if (isStudbookLine(lines[j]) && !isStudbookLine(lines[j - 1])) ancestors.push(cleanTextName(lines[j - 1]));
  }
  const complete = ancestors.length === ANCESTORS_IN_TREE;
  const pick = (key) => (complete ? ancestors[TEXT_POSITIONS[key]] : "");

  return {
    via: "text",
    pedigreeComplete: complete,
    horseName: main.name,
    breed: main.breed,
    dob: "",
    birthYear: main.year,
    origin: "",
    horsetelexUrl: "",
    sire: pick("sire"),
    dam: pick("dam"),
    gsire: pick("gsire"),
    gdam: pick("gdam"),
    mgsire: pick("mgsire"),
    mgdam: pick("mgdam"),
  };
}

// What the user pasted: a page source (preferred: exact, from Horsetelex's own data) or the
// visible text of the page. Returns null when it is neither, or has no horse in it; otherwise
// the horse's data with unknown fields as "" (never undefined). `via` says which route read it
// and `pedigreeComplete` is false when a text copy lacked ancestors (see above).
export function parseHorsetelexSource(text) {
  return parseFromSource(text) || parseFromText(text);
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
