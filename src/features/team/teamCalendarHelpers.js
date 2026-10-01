// Ports absenceFor/memberColor/memberColorSoft (public/legacy-app.js:3300-3313), as
// explicit-param pure functions instead of readers of the global D. monthStartStr/addMonth/
// monthLabel moved to lib/date.js (generic month math, reused by the board's month view) —
// re-exported here so existing callers of this module don't need to change their import.
export { monthStartStr, addMonth, monthLabel } from "../../lib/date.js";

export function absenceFor(absences, pid, date) {
  return (absences || []).find((a) => a.pid === pid && a.date === date);
}

const MEMBER_COLORS = [
  "#3A5F82",
  "#6B4E7D",
  "#B5544A",
  "#D4860B",
  "#2F7D5C",
  "#7A5C2E",
  "#4B6B44",
  "#8A4D76",
  "#5161A8",
  "#A0522D",
];

const MEMBER_COLORS_SOFT = [
  "#EAF0F8",
  "#F3EEF7",
  "#FDECEA",
  "#FEF3C7",
  "#E7F5EF",
  "#F4EBDD",
  "#EDF4E8",
  "#F8EEF5",
  "#EEF0FA",
  "#F7ECE4",
];

export function memberColor(team, pid) {
  const i = Math.max(0, team.findIndex((x) => x.id === pid));
  return MEMBER_COLORS[i % MEMBER_COLORS.length];
}

export function memberColorSoft(team, pid) {
  const i = Math.max(0, team.findIndex((x) => x.id === pid));
  return MEMBER_COLORS_SOFT[i % MEMBER_COLORS_SOFT.length];
}
