import { td, addD } from "../../lib/date.js";
import { uid } from "../../lib/id.js";
import { normTxt } from "./matching.js";
import { soPerson, soAllPersonMatches } from "./personMatching.js";
import { soHorsesInClause, soBulkHorseSelection, soFindHorseSegments } from "./horseMatching.js";
import { soDateFromText, soDuration, soAmount, soActivities, soHealth, soClauseActivity } from "./extractors.js";
import { soSplitSmartClauses } from "./clauseSplitting.js";

// Ports smartAnalyzeOrder (public/legacy-app.js:3013-3057) as a pure function composed of
// the modules above. Returns { items, noHorsesFound }: `items` is the draft-item list (each
// with an `allowed`/`candidates`/`uncertain` plus kind-specific fields, same shape legacy
// builds), and `noHorsesFound` distinguishes legacy's two distinct empty states — "no horse
// recognized at all" (even the segment-based fallback found nothing) vs. "horses were
// recognized but nothing usable was extracted from them" (items is empty either way, but
// the caller shows a different message for each, matching renderSmartReview's early-return
// vs. its own empty-list branch).
//
// One deliberate fix: each item also gets a `checked` boolean (defaulting to `allowed`),
// because legacy's confirmSmartOrder queries live `.so-check` DOM checkboxes instead of
// storing checked-state on the draft itself — there's no React-idiomatic equivalent of
// "query the DOM for checked boxes", so the state has to live somewhere, and the draft item
// is the obvious place. This is a mechanical adaptation, not a behavior change: the set of
// items a user can end up confirming is identical.
export function buildSmartOrderDraft(text, baseDate, { horses, team, isAdmin, myMemberId, canTasks, canHealth, canExpenses }) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { items: [], noHorsesFound: false };

  const base = baseDate || td();
  const props = [];
  const globalDate = soDateFromText(trimmed, base);
  const clauses = soSplitSmartClauses(trimmed, team);

  clauses.forEach((cl) => {
    const bulk = soBulkHorseSelection(cl, horses);
    const clauseHorses = bulk ? bulk.horses : soHorsesInClause(cl, horses);
    if (!clauseHorses.length) return;
    const date = soDateFromText(cl, globalDate);
    const dur = soDuration(cl);
    const person = soPerson(cl, team);
    const amount = soAmount(cl);
    const acts = soClauseActivity(cl);
    const health = soHealth(cl);
    clauseHorses.forEach((h) => {
      acts.forEach((a) =>
        props.push({
          id: uid(),
          kind: "task",
          hid: h.id,
          horse: h.name,
          date,
          activity: a.activity,
          dur: dur || 30,
          pid: person ? person.id : isAdmin ? null : myMemberId,
          personUncertain: person ? !!(soAllPersonMatches(cl, team)[0] || {}).uncertain : false,
          notes: [a.notes, normTxt(cl).includes("suave") ? "suave" : ""].filter(Boolean).join(" · "),
          allowed: canTasks,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        })
      );
      health.forEach((x) =>
        props.push({
          id: uid(),
          kind: "health",
          hid: h.id,
          horse: h.name,
          date: normTxt(cl).includes("ayer") ? addD(td(), -1) : date,
          type: x.type,
          label: x.label,
          notes: cl,
          amount: amount || 0,
          payStatus: "pendiente",
          payee: normTxt(cl).includes("veterin") ? "Veterinaria" : "",
          allowed: canHealth,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        })
      );
      if (amount) {
        const cat = normTxt(cl).includes("herrador") || normTxt(cl).includes("herraje") ? "herrador" : "vet";
        const concept = health.length ? health[0].label : "Gasto detectado en orden inteligente";
        props.push({
          id: uid(),
          kind: "expense",
          hid: h.id,
          horse: h.name,
          date: normTxt(cl).includes("ayer") ? addD(td(), -1) : date,
          cat,
          concept,
          amount,
          status: "pendiente",
          payer: "Cuadra",
          payee: normTxt(cl).includes("veterin") ? "Veterinaria" : "",
          notes: cl,
          allowed: canExpenses,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        });
      }
    });
  });

  let noHorsesFound = false;
  if (!props.length) {
    const segs = soFindHorseSegments(trimmed, horses);
    if (!segs.length) {
      return { items: [], noHorsesFound: true };
    }
    segs.forEach((sg) => {
      const h = sg.horse;
      const seg = sg.text;
      const date = soDateFromText(seg, globalDate);
      const dur = soDuration(seg);
      const person = soPerson(seg, team);
      const amount = soAmount(seg);
      const acts = soActivities(seg);
      const health = soHealth(seg);
      acts.forEach((a) =>
        props.push({
          id: uid(),
          kind: "task",
          hid: h.id,
          horse: h.name,
          date,
          activity: a.activity,
          dur: dur || 30,
          pid: person ? person.id : isAdmin ? null : myMemberId,
          personUncertain: person ? !!(soAllPersonMatches(seg, team)[0] || {}).uncertain : false,
          notes: [a.notes, seg.includes("suave") ? "suave" : ""].filter(Boolean).join(" · "),
          allowed: canTasks,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        })
      );
      health.forEach((x) =>
        props.push({
          id: uid(),
          kind: "health",
          hid: h.id,
          horse: h.name,
          date: normTxt(seg).includes("ayer") ? addD(td(), -1) : date,
          type: x.type,
          label: x.label,
          notes: seg,
          amount: amount || 0,
          payStatus: "pendiente",
          payee: seg.includes("veterin") ? "Veterinaria" : "",
          allowed: canHealth,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        })
      );
      if (amount) {
        const cat = seg.includes("herrador") || seg.includes("herraje") ? "herrador" : "vet";
        const concept = health.length ? health[0].label : "Gasto detectado en orden inteligente";
        props.push({
          id: uid(),
          kind: "expense",
          hid: h.id,
          horse: h.name,
          date: normTxt(seg).includes("ayer") ? addD(td(), -1) : date,
          cat,
          concept,
          amount,
          status: "pendiente",
          payer: "Cuadra",
          payee: seg.includes("veterin") ? "Veterinaria" : "",
          notes: seg,
          allowed: canExpenses,
          candidates: h._smartCandidates || [],
          uncertain: !!h._smartUncertain,
        });
      }
    });
  }

  const seen = new Set();
  const items = props
    .filter((x) => {
      const k = [x.kind, x.hid, x.date, x.activity || x.type || x.cat, x.concept || x.label || ""].join("|");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((x) => ({ ...x, checked: x.allowed }));

  return { items, noHorsesFound };
}
