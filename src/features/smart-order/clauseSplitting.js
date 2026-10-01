import { normTxt, soRegexEscape } from "./matching.js";
import { soTeamKeys } from "./matching.js";

// Ports soSplitSmartClauses (public/legacy-app.js:2956-2979): splits a free-text order like
// a real WhatsApp message would be split — on newlines/periods/semicolons, then within a
// line, cuts right before a team member's name when it's immediately followed by a verb
// ("Alejandro ha montado a X. También ha sacado a Y" -> two clauses).
export function soSplitSmartClauses(text, team) {
  const raw = String(text || "");
  const units = raw
    .split(/\n|[.;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const names = [];
  (team || []).forEach((m) => {
    soTeamKeys(m).forEach((k) => {
      if (["full", "first2", "first", "alias", "prefix3", "prefix4", "aliasPrefix3"].includes(k.type) && k.key.length >= 2 && !names.includes(k.key))
        names.push(k.key);
    });
  });
  names.sort((a, b) => b.length - a.length);
  const verbs =
    "ha montado|han montado|montado|montar|monta|ha saltado|saltado|saltar|salta|ha llevado|llevado|llevar|lleva|ha metido|metido|meter|mete|ha sacado|sacado|sacar|saca|ha puesto|puesto|poner|pone|ha hecho|hecho|hacer|hace";
  const out = [];
  units.forEach((u) => {
    let nt = normTxt(u);
    names.forEach((n) => {
      const re = new RegExp("\\b" + soRegexEscape(n) + "\\b\\s+(?=(?:" + verbs + ")\\b)", "g");
      nt = nt.replace(re, "| " + n + " ");
    });
    nt.split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x) => out.push(x));
  });
  return out;
}
