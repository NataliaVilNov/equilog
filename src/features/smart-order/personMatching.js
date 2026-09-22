import { normTxt, soRegexEscape, soTeamKeys } from "./matching.js";

// Ports soAllPersonMatches/soPerson (public/legacy-app.js:2807-2838): scores every team
// member's name/alias keys against the text, resolves overlapping matches by score, and
// flags a match uncertain when it came from a low-confidence key type (prefix/token) or
// when two different people scored a near-tie at the same position.
export function soAllPersonMatches(text, team) {
  const nt = normTxt(text);
  if (!nt) return [];
  const raw = [];
  (team || []).forEach((m) => {
    soTeamKeys(m).forEach((k) => {
      const re = new RegExp("(^|\\s)" + soRegexEscape(k.key) + "(?=\\s|$)", "g");
      let r;
      while ((r = re.exec(nt)) !== null) {
        const pos = r.index + (r[1] ? r[1].length : 0);
        const end = pos + k.key.length;
        raw.push({
          i: pos,
          end,
          m,
          score: k.score + k.key.length / 100,
          key: k.key,
          type: k.type,
          uncertain: ["prefix3", "prefix4", "aliasPrefix3", "token"].includes(k.type),
        });
        if (re.lastIndex === r.index) re.lastIndex++;
      }
    });
  });
  raw.sort((a, b) => a.i - b.i || b.score - a.score || b.end - b.i - (a.end - a.i));
  const chosen = [];
  raw.forEach((x) => {
    const ov = chosen.findIndex((y) => !(x.end <= y.i || x.i >= y.end));
    if (ov >= 0) {
      if (x.score > chosen[ov].score) chosen[ov] = x;
      else if (Math.abs(x.score - chosen[ov].score) < 8 && x.m.id !== chosen[ov].m.id) chosen[ov].uncertain = true;
      return;
    }
    chosen.push(x);
  });
  return chosen.sort((a, b) => a.i - b.i);
}

export function soPerson(txt, team) {
  const matches = soAllPersonMatches(txt, team);
  return matches.length ? matches[0].m : null;
}
