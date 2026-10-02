import { monthStartStr, addD, isoWeek } from "./date.js";

// Shared date math for a month-at-a-glance grid (leading blank-cell count for days before
// the 1st, days in the month, every date string in the month). Lifted out of
// MonthBoardGrid.jsx/TeamCalendarPage.jsx, which had each hand-rolled this identically —
// cell rendering/styling stays in each file since that part legitimately differs between
// them (board activity pills vs. absence badges vs. task counts). A plain function, not a
// hook (no internal useState/useEffect) — both call sites use it after an early return, which
// would violate rules-of-hooks if it actually were one.
export const MONTH_GRID_WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export function getMonthGrid(m) {
  const first = new Date(monthStartStr(m) + "T12:00:00");
  const y = first.getFullYear();
  const mo = first.getMonth();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const dateStrings = Array.from({ length: daysInMonth }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`);

  // One entry per calendar row: the Monday it starts on, its ISO week number, and 7 slots
  // (date string, or null for the padding before the 1st / after the last day).
  const weeks = Array.from({ length: Math.ceil((firstDow + daysInMonth) / 7) }, (_, w) => {
    const monday = addD(dateStrings[0], w * 7 - firstDow);
    const days = Array.from({ length: 7 }, (_, i) => dateStrings[w * 7 + i - firstDow] || null);
    return { monday, isoWeek: isoWeek(monday), days };
  });

  return {
    firstDow,
    weeks,
    daysInMonth,
    dateStrings,
    rangeStart: monthStartStr(m),
    rangeEnd: dateStrings[dateStrings.length - 1],
  };
}
