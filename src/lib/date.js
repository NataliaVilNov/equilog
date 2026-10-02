export function td() {
  return new Date().toISOString().slice(0, 10);
}

export function addD(s, n) {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ISO-8601 week number (weeks start Monday; week 1 contains the year's first Thursday).
export function isoWeek(s) {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((d - firstThursday) / (7 * 86400000));
}

export function fD(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fDL(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function dU(s) {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((new Date(s + "T12:00:00") - n) / 86400000);
}

// Generic month math, originally written for the team absence calendar
// (public/legacy-app.js:3300-3313) — moved here so any other month-grid view (e.g. the
// board's month tab) can reuse it instead of duplicating it. teamCalendarHelpers.js
// re-exports these so its existing callers don't need to change their import.
export function monthStartStr(m) {
  return (m || td().slice(0, 7)) + "-01";
}

export function addMonth(m, n) {
  const d = new Date(monthStartStr(m) + "T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function monthLabel(m) {
  return new Date(monthStartStr(m) + "T12:00:00").toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}
