import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseClient.js";
import { expandOccurrences } from "../lib/recurrence.js";

// For a date range (a single visible date when rangeEnd is omitted), returns one task-shaped
// view model per (task, occurrence date) pair within the range. A non-recurring task passes
// through unchanged (same read behavior tasksForDate gave before recurrence existed) if its
// startDate falls in range. A recurring task gets one row per matching date, with that date's
// `status`/`assignedTo` substituted from its sparse occurrence-exception doc — "pending" and
// the series' default assignee when no exception doc exists for that date, per the
// sparse-occurrences design in docs/DATABASE.md.
export function useTaskOccurrences(stableId, tasks, rangeStart, rangeEnd = rangeStart) {
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    if (!stableId || !rangeStart || !rangeEnd) {
      setOverrides([]);
      return;
    }
    const q = query(
      collectionGroup(db, "occurrences"),
      where("stableId", "==", stableId),
      where("date", ">=", rangeStart),
      where("date", "<=", rangeEnd)
    );
    return onSnapshot(q, (snap) => {
      setOverrides(snap.docs.map((d) => d.data()));
    });
  }, [stableId, rangeStart, rangeEnd]);

  if (!rangeStart || !rangeEnd) return [];

  const rows = [];
  (tasks || []).forEach((t) => {
    expandOccurrences(t, rangeStart, rangeEnd).forEach((date) => {
      if (!t.recurrenceRule) {
        rows.push(t);
        return;
      }
      // Overrides span the whole range now (not just one date, as when this hook only
      // supported a single date), so the match must pin the date too — matching on taskId
      // alone would let one date's status/assignee leak onto every occurrence in range.
      const override = overrides.find((o) => o.taskId === t.id && o.date === date);
      rows.push({
        ...t,
        status: override ? override.status : "pending",
        assignedTo: override && override.overrideAssignedTo ? override.overrideAssignedTo : t.assignedTo,
        isRecurringOccurrence: true,
        occurrenceDate: date,
      });
    });
  });
  return rows;
}
