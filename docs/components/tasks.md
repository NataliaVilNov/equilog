# Tasks (daily task board)

## Overview

The "Hoy" (Today) daily task board — a per-day list of activities across all horses **and**
general stable chores, assignable to team members (or left unassigned, in which case it shows
on everyone's day), with a tap-to-cycle status control and a per-person filter. A task can
optionally repeat on a schedule (daily/weekly/monthly, Google-Calendar-style — by weekday, the
Nth weekday of the month, or a fixed day of the month), in which case each date it falls on is
tracked as its own independent completion state. Cycling certain activities (monta/longe/
trabajo suave) to "done" auto-creates a pending session-report alert, but only for horse-linked
tasks — a general chore has no horse to attach a training report to; paddock/caminador tasks
cycle through an extra "llevado" (taken out) step before "recogido" (brought back), since those
need a return trip. Ported from `public/legacy-app.js:3127-3277` (per-horse tasks) unified
with `public/legacy-app.js:2213-2311` (`rNCT`/`doneCT`, the old stable-wide "cuadra" tasks —
see `docs/components/stable-wide.md`, which now covers expenses only).

## Implementation

**Component tree**
```
src/features/tasks/
  taskHelpers.js       — pure status/label/date-filter helpers, no DOM/global reads
  recurrence.js (src/lib/) — pure recurrence-rule expansion, no Firestore/React
  RecurrencePicker.jsx  — the none/daily/weekly/monthly rule editor used by TaskFormPage
  TaskCard.jsx           — one task/occurrence row with the cycle-status button, also reused
                            by HomePage and MemberDayPage
  DayBoardPage.jsx         — /day, ports rDay — now the single day view for horse-linked and
                              general tasks alike (no separate "cuadra tareas" screen)
  TaskFormPage.jsx          — /tasks/new, /tasks/:tid/edit, ports rNTask unified with rNCT
```

**Data model** (see `docs/DATABASE.md` for the full schema)
- `stables/{stableId}/tasks/{taskId}` — one unified collection. `horseId` is nullable (`null`
  = general chore, not tied to a horse). `assignedTo` is nullable (`null` = shows on every
  team member's day, computed at read time, not fanned out as separate docs). `recurrenceRule`
  is an embedded map (`freq`/`interval`/`byWeekday`/`bySetPos`/`byMonthDay`/`until`/`count`) or
  `null` for a one-off task whose due date is just `startDate`.
- `stables/{stableId}/tasks/{taskId}/occurrences/{date}` — sparse. No document for a date means
  that occurrence is implicitly pending with the series' default `assignedTo`; a document is
  only written when a specific date's occurrence diverges (marked done/skipped). This mirrors
  editing a single instance of a recurring event in Google Calendar, and avoids ever having to
  materialize a recurring task's future occurrences.

**State & data**
- `StableDataContext` gained `addTask`, `updateTask`, `deleteTask` (also clears any
  `sessionAlerts` *and* `occurrences` tied to the deleted task), `cycleTaskStatus(id)` for a
  non-recurring task's own `status` field, and `cycleOccurrenceStatus(occurrenceTask)` for one
  date's occurrence of a recurring task — same status-cycling rules
  (`taskNeedsReturn`/session-alert creation) as `cycleTaskStatus`, just writing to that date's
  `occurrences/{date}` doc instead of the task doc. Both create a session-alert only when
  `activity.r` is set **and** `horseId != null`.
- `src/lib/recurrence.js` (`expandOccurrences`, `matchesRule`, `weekdayCode`,
  `nthWeekdayOfMonth`) is pure, framework-free date math — Firestore has no server-side RRULE
  query, so recurrence has to be expanded client-side for whatever range a screen renders.
- `useTaskOccurrences(stableId, tasks, date)` (`src/hooks/`) is the read-side counterpart: for
  one visible date, it returns one task-shaped view model per task that occurs that day — a
  non-recurring task passes through unchanged, a recurring task gets its `status`/`assignedTo`
  substituted from that date's occurrence doc (or defaults if none exists). Every screen that
  used to call `tasksForDate` for a single day (`DayBoardPage`, `MemberDayPage`, `HomePage`)
  now calls this instead — it replaces `tasksForDate` for those screens, since it does the
  same exact-date filtering for one-off tasks and adds recurring expansion in the same pass.
  Currently scoped to single-date screens only, not a date range (e.g. Boards' week view) —
  there was no multi-day task view to wire it into in this pass.
- `DayBoardPage` reads both the selected date and the person filter from URL search params
  (`?d=`, `?person=`), same pattern as every other stateful view in this migration —
  bookmarkable, and the prev/next-day buttons are just search-param updates.
- `TaskFormPage` builds one record for both horse-linked and general tasks: the horse `<select>`
  has an explicit "Ninguno · tarea general" option; the activity input is a hybrid — the
  existing `AK` icon grid when a horse is chosen, a free-text field when it isn't (stored
  straight into `activity` — `activityById()`'s existing fallback already renders any
  unrecognized string with a generic icon, so no `constants.js` change was needed). The old
  `StableTaskFormPage`'s 14-icon emoji picker was dropped — the target schema has no `icon`
  field, and the generic-icon fallback covers it.

**Routing**
- `/day` — no permission gate (matches legacy; everyone with app access can view the board).
- `/tasks/new`, `/tasks/:tid/edit` → `TaskFormPage`, under `<PermissionRoute requires="tasks">`.
- `/cuadra/tasks/new` and `/cuadra/tasks/:eid/edit` are gone — stable-wide chores are created
  through the same `/tasks/new` form as horse tasks now.

**Permissions**
- `can('tasks')` gates the FAB (new task) and the form routes.
- `can('deleteItems')` gates a task's delete button.
- Non-admin users get a fixed "assigned to you" read-only line instead of the person picker
  in `TaskFormPage`, matching `rNTask`'s `admin`-gated picker (`public/legacy-app.js:3251-3260`).
- `can('team')` gates the "Informe equipo" button.

**Notable decisions / deviations from the legacy behavior**
- Unifying `tasks`/`ctasks` is a deliberate departure from legacy, not a straight port — see
  `docs/DATABASE.md` §7 for the schema rationale. The single-person-filtered day view keeps
  legacy's detail that the group header is still clickable and navigates to that same person's
  day view (`public/legacy-app.js:3185`).
- A recurring task's own `status` field is unused — its per-occurrence status lives entirely
  in the `occurrences` subcollection. Editing or deleting a task edits/deletes the whole
  series; there's no per-instance edit UI (e.g. "just this Thursday"), only per-instance
  status (done/pending), matching the scope of what was asked for.

**Known gaps / follow-ups**
- `StatsPage`'s team-task stats still use a plain date-range filter on `tasks`, not
  `useTaskOccurrences` — a recurring task's individual occurrences don't currently roll up
  into historical stats correctly (that needs a ranged version of the occurrences hook, not
  built in this pass).
- The day board's "Orden inteligente" (Smart Order) and "Informe equipo" buttons are
  forward-links, same deferred-link pattern used throughout this migration.
