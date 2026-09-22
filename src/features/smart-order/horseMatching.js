import { normTxt, soHorseKeys, soHorseBoundaryRegex } from "./matching.js";

// Ports soHorseCandidateGroup/soAllHorseMatches (public/legacy-app.js:2860-2904): the
// horse-name matching engine — same scored-key approach as person matching, plus
// candidate-group tracking for when two horses tie on the exact same text (e.g. two
// horses that legitimately share a short nickname), which is what feeds a draft item's
// horse-reassignment dropdown.
export function soHorseCandidateGroup(key, horses) {
  const hs = [];
  (horses || []).forEach((h) => {
    if (soHorseKeys(h).some((k) => k.key === key)) hs.push(h);
  });
  return hs;
}

export function soAllHorseMatches(text, horses) {
  const nt = normTxt(text);
  if (!nt) return [];
  const raw = [];
  (horses || []).forEach((h) => {
    soHorseKeys(h).forEach((k) => {
      const variants = [k.key];
      if (k.key.includes(" ")) variants.push(k.key.replace(/\s+/g, ""));
      variants.forEach((v) => {
        const re = soHorseBoundaryRegex(v);
        let m;
        while ((m = re.exec(nt)) !== null) {
          const pos = m.index + (m[1] ? m[1].length : 0);
          const end = pos + v.length;
          const candidates = soHorseCandidateGroup(k.key, horses);
          raw.push({
            i: pos,
            end,
            h,
            score: k.score + v.length / 100,
            key: k.key,
            type: k.type,
            candidates,
            uncertain: candidates.length > 1 || ["first", "token", "compact"].includes(k.type),
          });
          if (re.lastIndex === m.index) re.lastIndex++;
        }
      });
    });
  });
  raw.sort((a, b) => a.i - b.i || b.score - a.score || b.end - b.i - (a.end - a.i));
  const chosen = [];
  raw.forEach((m) => {
    const same = chosen.findIndex((x) => x.h.id === m.h.id && !(m.end <= x.i || m.i >= x.end));
    if (same >= 0) {
      if (m.score > chosen[same].score) chosen[same] = m;
      return;
    }
    const ov = chosen.findIndex((x) => !(m.end <= x.i || m.i >= x.end));
    if (ov >= 0) {
      const old = chosen[ov];
      if (Math.abs(old.i - m.i) < 2 && old.key === m.key) {
        old.candidates = Array.from(
          new Map([...(old.candidates || [old.h]), ...(m.candidates || [m.h]), old.h, m.h].map((h) => [h.id, h])).values()
        );
        old.uncertain = true;
      } else if (m.score > old.score) {
        chosen[ov] = m;
      }
      return;
    }
    chosen.push(m);
  });
  return chosen.sort((a, b) => a.i - b.i);
}

// Ports soFindHorseSegments (public/legacy-app.js:2905-2914): the fallback parser used when
// no clause-based structure was found — splits the whole text into one segment per matched
// horse, from that horse's match position to the next match's position.
export function soFindHorseSegments(text, horses) {
  const nt = normTxt(text);
  const found = soAllHorseMatches(text, horses);
  const out = [];
  found.forEach((f, idx) => {
    const end = idx < found.length - 1 ? found[idx + 1].i : nt.length;
    const h = Object.assign({}, f.h, { _smartCandidates: f.candidates || [f.h], _smartUncertain: !!f.uncertain });
    out.push({ horse: h, text: nt.slice(f.i, end) });
  });
  return out;
}

// Ports soHorsesInClause (public/legacy-app.js:2981-2989).
export function soHorsesInClause(clause, horses) {
  const matches = soAllHorseMatches(clause, horses);
  const seen = new Set();
  const out = [];
  matches.forEach((m) => {
    if (seen.has(m.h.id)) return;
    seen.add(m.h.id);
    out.push(Object.assign({}, m.h, { _smartCandidates: m.candidates || [m.h], _smartUncertain: !!m.uncertain }));
  });
  return out;
}

// Ports soBulkHorseSelection (public/legacy-app.js:2991-3011): detects "todos los caballos
// [menos X]"-style orders.
export function soBulkHorseSelection(clause, horses) {
  const nt = normTxt(clause);
  if (!nt) return null;
  const hasAll =
    /(^|\s)(todos|todas)(\s+los\s+caballos|\s+las\s+yeguas|\s+los\s+potros|\s+los\s+caballos)?(?=\s|$)/.test(nt) ||
    /\b(toda\s+la\s+cuadra|todos\s+los\s+caballos)\b/.test(nt);
  if (!hasAll) return null;
  const excludeWords = ["menos", "excepto", "salvo"];
  let exText = "";
  for (const w of excludeWords) {
    const idx = nt.indexOf(" " + w + " ");
    if (idx >= 0) {
      exText = nt.slice(idx + w.length + 2);
      break;
    }
    if (nt.startsWith(w + " ")) {
      exText = nt.slice(w.length + 1);
      break;
    }
  }
  const excluded = new Set();
  if (exText) {
    soAllHorseMatches(exText, horses).forEach((m) => excluded.add(m.h.id));
  }
  const out = (horses || [])
    .filter((h) => !excluded.has(h.id))
    .map((h) => Object.assign({}, h, { _smartCandidates: [h], _smartUncertain: false }));
  return { horses: out, excluded: Array.from(excluded) };
}
