// Ports normTxt/soRegexEscape/soHorseStopWords/soTeamKeys/soHorseKeys/soHorseBoundaryRegex
// (public/legacy-app.js:2750,2943,2839,2779-2806,2840-2855,2856-2859) — the shared
// scored-key-matching primitives both person- and horse-matching (personMatching.js,
// horseMatching.js) build on.

export function normTxt(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function soRegexEscape(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function soHorseStopWords() {
  return new Set(["de", "del", "la", "el", "los", "las", "van", "von", "du", "des", "da", "do", "di", "the", "of", "y", "z", "ps", "pre", "s", "ii", "iii"]);
}

// Ports the person key-scoring block of soTeamKeys (public/legacy-app.js:2779-2806).
export function soTeamKeys(m) {
  const keys = [];
  const add = (key, score, type) => {
    key = normTxt(key);
    if (!key || key.length < 2) return;
    if (!keys.some((k) => k.key === key)) keys.push({ key, score, type });
  };
  const n = normTxt(m.name || "");
  if (n) {
    add(n, 120, "full");
    const parts = n.split(" ").filter(Boolean);
    if (parts.length >= 1) {
      add(parts[0], 100, "first");
      if (parts[0].length >= 4) add(parts[0].slice(0, 3), 76, "prefix3");
      if (parts[0].length >= 5) add(parts[0].slice(0, 4), 82, "prefix4");
    }
    if (parts.length >= 2) add(parts.slice(0, 2).join(" "), 110, "first2");
    parts.forEach((t) => {
      if (t.length >= 4) add(t, 62, "token");
    });
  }
  String(m.aliases || m.alias || m.nick || "")
    .split(/[,;|\n]+/)
    .forEach((a) => {
      a = normTxt(a);
      if (a) {
        add(a, 115, "alias");
        if (a.length >= 4) add(a.slice(0, 3), 78, "aliasPrefix3");
      }
    });
  return keys.sort((a, b) => b.score - a.score || b.key.length - a.key.length);
}

// Ports soHorseKeys (public/legacy-app.js:2840-2855).
export function soHorseKeys(h) {
  const stop = soHorseStopWords();
  const keys = [];
  const add = (key, score, type) => {
    key = normTxt(key);
    if (!key || key.length < 2) return;
    if (stop.has(key)) return;
    if (!keys.some((k) => k.key === key)) keys.push({ key, score, type });
  };
  const n = normTxt(h.name || "");
  if (n) {
    add(n, 120, "full");
    const parts = n.split(" ").filter(Boolean);
    if (parts.length >= 2) add(parts.slice(0, 2).join(" "), 95, "first2");
    if (parts.length >= 1 && parts[0].length >= 3) add(parts[0], 82, "first");
    parts.forEach((t) => {
      if (t.length >= 4 && !stop.has(t)) add(t, 48, "token");
    });
    const compact = n.replace(/\s+/g, "");
    if (compact.length >= 4) add(compact, 70, "compact");
  }
  String(h.aliases || h.alias || "")
    .split(/[,;|\n]+/)
    .forEach((a) => {
      a = normTxt(a);
      if (a) {
        add(a, 110, "alias");
        const compact = a.replace(/\s+/g, "");
        if (compact.length >= 4) add(compact, 90, "aliasCompact");
      }
    });
  return keys.sort((a, b) => b.score - a.score || b.key.length - a.key.length);
}

// Ports soHorseBoundaryRegex (public/legacy-app.js:2856-2859).
export function soHorseBoundaryRegex(key) {
  return new RegExp("(^|\\s)" + soRegexEscape(key) + "(?=\\s|$)", "g");
}
