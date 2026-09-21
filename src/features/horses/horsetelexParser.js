// Ports extractHorsetelexFromHtml and its string helpers (public/legacy-app.js:2654-2738),
// plus applyPedigree (public/legacy-app.js:2638-2651) adapted to return data instead of
// writing directly into DOM inputs.

export function normalizePedText(txt) {
  return String(txt || "")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function cleanHorseName(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;\-–—|]+|[\s:;\-–—|]+$/g, "")
    .replace(/\b(HorseTelex|horsetelex|pedigree|offspring|progeny|details|information)\b/gi, "")
    .replace(/\([^)]*\b(stallion|mare|gelding|hengst|merrie|ruin|sire|dam)\b[^)]*\)/gi, "")
    .trim();
}

export function isLikelyHorseName(s) {
  if (!s || s.length < 2 || s.length > 70) return false;
  if (/^\d+$/.test(s)) return false;
  if (
    /@|http|www\.|cookie|login|search|menu|privacy|contact|advert|owner|breeder|born|sex|color|height|studbook|offspring|pedigree|details|information|show more/i.test(
      s
    )
  )
    return false;
  if ((s.match(/\d/g) || []).length > 5) return false;
  return /[A-Za-zÀ-ÿ]/.test(s);
}

export function uniqueHorseNames(arr) {
  const out = [];
  const seen = new Set();
  arr.forEach((x) => {
    const c = cleanHorseName(x);
    const k = c.toLowerCase();
    if (c && isLikelyHorseName(c) && !seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  });
  return out;
}

export function sameHorse(a, b) {
  if (!a || !b) return false;
  const ca = cleanHorseName(a).toLowerCase();
  const cb = cleanHorseName(b).toLowerCase();
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

export function extractHorsetelexFromHtml(html) {
  const result = { sire: "", dam: "", gsire: "", gdam: "", mgsire: "", mgdam: "", horseName: "", breed: "", dob: "" };
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");

  const titleCandidates = [
    doc.querySelector("h1"),
    doc.querySelector("h2"),
    doc.querySelector(".horse-name"),
    doc.querySelector(".title"),
    doc.querySelector("title"),
  ]
    .filter(Boolean)
    .map((x) => x.textContent || "")
    .map(cleanHorseName)
    .filter(Boolean);
  result.horseName = titleCandidates[0] || "";

  const bodyText = normalizePedText(doc.body ? doc.body.innerText : html);
  const labelMap = [
    ["sire", /(?:^|\n)\s*(?:sire|father|padre)\s*[:\-]?\s*([^\n]+)/i],
    ["dam", /(?:^|\n)\s*(?:dam|mother|madre)\s*[:\-]?\s*([^\n]+)/i],
    ["gsire", /(?:^|\n)\s*(?:sire of sire|father of sire|abuelo paterno|grandsire)\s*[:\-]?\s*([^\n]+)/i],
    ["mgsire", /(?:^|\n)\s*(?:sire of dam|father of dam|abuelo materno|damsire)\s*[:\-]?\s*([^\n]+)/i],
  ];
  labelMap.forEach(([k, re]) => {
    const m = bodyText.match(re);
    if (m && !result[k]) result[k] = cleanHorseName(m[1]);
  });

  const nodes = [];
  const pedigreeSelectors = "table[class*=ped], table[id*=ped], .pedigree, [class*=pedigree], [id*=pedigree]";
  const pedRoots = Array.from(doc.querySelectorAll(pedigreeSelectors));
  const roots = pedRoots.length ? pedRoots : [doc.body || doc];
  roots.forEach((root) => {
    Array.from(root.querySelectorAll('a[href*="/horses/"], a[href*="horse"], td, th, div, span')).forEach((el) => {
      const txt = cleanHorseName(el.textContent || "");
      if (isLikelyHorseName(txt)) nodes.push(txt);
    });
  });
  const names = uniqueHorseNames(nodes).filter((n) => !sameHorse(n, result.horseName));

  const patterns = [];
  if (names.length >= 6) {
    patterns.push({ sire: names[0], dam: names[1], gsire: names[2], gdam: names[3], mgsire: names[4], mgdam: names[5] });
    patterns.push({ sire: names[0], gsire: names[1], gdam: names[2], dam: names[3], mgsire: names[4], mgdam: names[5] });
    patterns.push({ sire: names[1], dam: names[2], gsire: names[3], gdam: names[4], mgsire: names[5], mgdam: names[6] || "" });
  } else if (names.length >= 2) {
    patterns.push({
      sire: names[0],
      dam: names[1],
      gsire: names[2] || "",
      gdam: names[3] || "",
      mgsire: names[4] || "",
      mgdam: names[5] || "",
    });
  }
  const best = patterns.find((p) => p.sire && p.dam) || patterns[0] || {};
  ["sire", "dam", "gsire", "gdam", "mgsire", "mgdam"].forEach((k) => {
    if (!result[k] && best[k]) result[k] = best[k];
  });

  const dobMatch = bodyText.match(/(?:born|nacido|nacimiento|date of birth)\s*[:\-]?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/i);
  if (dobMatch) {
    const dd = dobMatch[1].padStart(2, "0");
    const mm = dobMatch[2].padStart(2, "0");
    const yy = dobMatch[3];
    result.dob = `${yy}-${mm}-${dd}`;
  }

  return result;
}

// Ports applyPedigree, minus the direct DOM writes: returns which fields to update and
// whether the import counts as a success (matches the same success heuristic).
export function applyPedigree(ped, current) {
  const updates = {};
  let changed = false;
  const set = (key, val) => {
    const cleaned = cleanHorseName(val || "");
    if (cleaned) {
      updates[key] = cleaned;
      changed = true;
    }
  };
  set("sire", ped && ped.sire);
  set("dam", ped && ped.dam);
  set("gsire", ped && ped.gsire);
  set("gdam", ped && ped.gdam);
  set("mgsire", ped && ped.mgsire);
  set("mgdam", ped && ped.mgdam);
  if (ped && ped.horseName && !(current && current.name)) {
    updates.name = ped.horseName;
    changed = true;
  }
  if (ped && ped.breed && !(current && current.breed)) {
    updates.breed = ped.breed;
    changed = true;
  }
  if (ped && ped.dob && !(current && current.dob)) {
    updates.dob = ped.dob;
    changed = true;
  }
  const success = changed && !!(ped && (ped.sire || ped.dam || ped.gsire || ped.mgsire));
  return { updates, success };
}
