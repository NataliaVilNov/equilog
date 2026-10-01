import { addD, td } from "./date.js";

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Firestore-free, framework-free — pure date math so this stays independently checkable.
export function weekdayCode(dateStr) {
  return WEEKDAY_CODES[new Date(dateStr + "T12:00:00").getDay()];
}

// 1-based "this is the Nth <weekday> of its month" ordinal, or the count from the end
// (-1 = last, -2 = second-to-last, ...) when `fromEnd` is true.
export function nthWeekdayOfMonth(dateStr, fromEnd = false) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDate();
  if (!fromEnd) return Math.ceil(day / 7);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return -Math.ceil((lastDay - day + 1) / 7);
}

function monthDayCount(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Whole `freq` periods elapsed between two ISO date strings — used for interval matching
// ("every 2 weeks"). Assumes `to >= from`.
function elapsedPeriods(freq, from, to) {
  const fromDate = new Date(from + "T12:00:00");
  const toDate = new Date(to + "T12:00:00");
  if (freq === "daily") {
    return Math.round((toDate - fromDate) / 86400000);
  }
  if (freq === "weekly") {
    return Math.floor(Math.round((toDate - fromDate) / 86400000) / 7);
  }
  // monthly
  return (
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth())
  );
}

export function matchesRule(rule, dateStr, anchorStartDate) {
  if (dateStr < anchorStartDate) return false;
  if (rule.until && dateStr > rule.until) return false;

  const freq = rule.freq;
  const interval = rule.interval || 1;
  const elapsed = elapsedPeriods(freq, anchorStartDate, dateStr);
  if (elapsed < 0 || elapsed % interval !== 0) return false;

  if (freq === "daily") return true;

  if (freq === "weekly") {
    if (rule.byWeekday && rule.byWeekday.length) {
      return rule.byWeekday.includes(weekdayCode(dateStr));
    }
    return weekdayCode(dateStr) === weekdayCode(anchorStartDate);
  }

  // monthly
  if (rule.byMonthDay) {
    const day = new Date(dateStr + "T12:00:00").getDate();
    return day === Math.min(rule.byMonthDay, monthDayCount(dateStr));
  }
  if (rule.byWeekday && rule.byWeekday.length && rule.bySetPos) {
    if (!rule.byWeekday.includes(weekdayCode(dateStr))) return false;
    return nthWeekdayOfMonth(dateStr, rule.bySetPos < 0) === rule.bySetPos;
  }
  return new Date(dateStr + "T12:00:00").getDate() === new Date(anchorStartDate + "T12:00:00").getDate();
}

// Safety cap so a count-bounded series can't loop indefinitely — well beyond any realistic
// day/week/month view this app renders.
const MAX_WALK_DAYS = 366 * 3;

// A count-bounded series (rule.count) needs the true occurrence history to know how many have
// already happened, so it walks from the series' own start. Everything else only needs to
// evaluate matchesRule per date, which is self-contained relative to the anchor, so it can
// start the walk at the visible range instead — the common case stays O(range length), not
// O(days since the task was created).
export function expandOccurrences(task, rangeStart, rangeEnd) {
  const rule = task.recurrenceRule;
  if (!rule) {
    return task.startDate >= rangeStart && task.startDate <= rangeEnd ? [task.startDate] : [];
  }

  const dates = [];
  const walkStart = rule.count
    ? task.startDate
    : task.startDate > rangeStart
    ? task.startDate
    : rangeStart;
  let count = 0;
  let walked = 0;
  let d = walkStart;
  while (walked < MAX_WALK_DAYS && d <= rangeEnd) {
    if (rule.until && d > rule.until) break;
    if (matchesRule(rule, d, task.startDate)) {
      count++;
      if (rule.count && count > rule.count) break;
      if (d >= rangeStart) dates.push(d);
    }
    d = addD(d, 1);
    walked++;
  }
  return dates;
}

export { td };
