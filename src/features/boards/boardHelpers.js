import { td, addD, dU } from "../../lib/date.js";

// Ports boardActivity/boardStartOfWeek/boardWeekDates/boardPlan/boardPlanActs/
// boardHasActivity/boardPeriodicValue/boardToneClass/boardDateLabel/
// boardActivityCandidates/boardAssignment/boardAssignedHorseIds/horseConflict/
// safeBoardId/periodicStatus (public/legacy-app.js:1300-1319,1347,1374-1376,1410-1415,
// 1456) as explicit-param pure functions instead of readers of the global D.

export function boardActivity(activities, id) {
  return (activities || []).find((a) => a.id === id) || { id, code: "?", label: id, tone: "gray" };
}

export function boardStartOfWeek(dateStr) {
  const d = new Date((dateStr || td()) + "T12:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export function boardWeekDates(start) {
  return Array.from({ length: 7 }, (_, i) => addD(start, i));
}

export function boardPlan(weeklyPlans, hid, date) {
  return (weeklyPlans || []).find((p) => p.hid === hid && p.date === date) || null;
}

export function boardPlanActs(weeklyPlans, hid, date) {
  const p = boardPlan(weeklyPlans, hid, date);
  return p && Array.isArray(p.activities) ? p.activities : [];
}

export function boardHasActivity(weeklyPlans, hid, date, activityId) {
  return boardPlanActs(weeklyPlans, hid, date).includes(activityId);
}

export function boardPeriodicValue(periodicBoardDates, hid, columnId) {
  const x = (periodicBoardDates || []).find((r) => r.hid === hid && r.columnId === columnId);
  return x ? x.date : "";
}

export function boardToneClass(t) {
  return "ba-" + (t || "gray");
}

export function boardDateLabel(d) {
  return new Date(d + "T12:00:00")
    .toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
    .replace(".", "");
}

// The candidate pool for a resource board is hardcoded to the 'caminador'/'paddock'
// activity ids, exactly as legacy has it — see docs/components/boards.md for why this
// (and the fact it can go stale if those two activities are renamed/removed via config)
// is preserved rather than fixed.
export function boardActivityCandidates(horses, weeklyPlans, type, date) {
  const actId = type === "walker" ? "caminador" : "paddock";
  return (horses || []).filter((h) => boardHasActivity(weeklyPlans, h.id, date, actId));
}

export function boardAssignment(boardAssignments, type, date, resourceId, slotId, position) {
  return (boardAssignments || []).find(
    (a) =>
      a.type === type &&
      a.date === date &&
      a.resourceId === resourceId &&
      a.slotId === slotId &&
      Number(a.position) === Number(position)
  );
}

export function boardAssignedHorseIds(boardAssignments, type, date) {
  return new Set((boardAssignments || []).filter((a) => a.type === type && a.date === date).map((a) => a.hid));
}

function slotTimes(boardConfig, type, slotId) {
  if (type === "walker") {
    for (const w of boardConfig.walkers) {
      const s = w.slots.find((x) => x.id === slotId);
      if (s) return s;
    }
    return null;
  }
  return boardConfig.paddockSlots.find((x) => x.id === slotId) || null;
}

export function horseConflict(boardConfig, boardAssignments, hid, date, type, slotId) {
  const slot = slotTimes(boardConfig, type, slotId);
  const start = slot ? slot.start : "";
  const end = slot ? slot.end : "";
  return (boardAssignments || []).find((a) => {
    if (a.hid !== hid || a.date !== date || a.slotId === slotId) return false;
    const other = slotTimes(boardConfig, a.type, a.slotId);
    return other && start < other.end && end > other.start;
  });
}

export function safeBoardId(prefix, label) {
  return (
    prefix +
    "_" +
    (label || "item")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) +
    "_" +
    Math.random().toString(36).slice(2, 6)
  );
}

export function periodicStatus(date) {
  if (!date) return { cls: "gray", txt: "Sin fecha" };
  const days = dU(date);
  if (days < 0) return { cls: "red", txt: "Vencido" };
  if (days <= 14) return { cls: "amber", txt: "Próximo" };
  return { cls: "green", txt: "Al día" };
}
