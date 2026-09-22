import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseClient.js";
import { expandOccurrences } from "../lib/recurrence.js";

// For a single visible date, returns one task-shaped view model per task that occurs on that
// date. A non-recurring task passes through unchanged (same read behavior tasksForDate gave
// before recurrence existed). A recurring task gets its `status`/`assignedTo` substituted
// from that date's sparse occurrence-exception doc — "pending" and the series' default
// assignee when no exception doc exists for the date, per the sparse-occurrences design in
// docs/DATABASE.md.
export function useTaskOccurrences(stableId, tasks, date) {
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    if (!stableId || !date) {
      setOverrides([]);
      return;
    }
    const q = query(
      collectionGroup(db, "occurrences"),
      where("stableId", "==", stableId),
      where("date", "==", date)
    );
    return onSnapshot(q, (snap) => {
      setOverrides(snap.docs.map((d) => d.data()));
    });
  }, [stableId, date]);

  if (!date) return [];

  return (tasks || [])
    .filter((t) => expandOccurrences(t, date, date).length > 0)
    .map((t) => {
      if (!t.recurrenceRule) return t;
      const override = overrides.find((o) => o.taskId === t.id);
      return {
        ...t,
        status: override ? override.status : "pending",
        assignedTo: override && override.overrideAssignedTo ? override.overrideAssignedTo : t.assignedTo,
        isRecurringOccurrence: true,
        occurrenceDate: date,
      };
    });
}
