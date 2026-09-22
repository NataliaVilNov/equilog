# Tasks (daily task board)

## Overview

The "Hoy" (Today) daily task board — a per-day list of activities across all horses,
assignable to team members, with a tap-to-cycle status control and a per-person filter.
Cycling certain activities (monta/longe/trabajo suave) to "done" auto-creates a pending
session-report alert; paddock/caminador tasks cycle through an extra "llevado" (taken out)
step before "recogido" (brought back), since those need a return trip. Ported from
`public/legacy-app.js:3127-3277`.

## Implementation

**Component tree**
```
src/features/tasks/
  taskHelpers.js       — pure status/label/date-filter helpers, no DOM/global reads
  TaskCard.jsx           — one task row with the cycle-status button, also reused by
                            HomePage (Phase 4c)
  DayBoardPage.jsx         — /day, ports rDay
  TaskFormPage.jsx          — /tasks/new, /tasks/:tid/edit, ports rNTask
```

**State & data**
- `StableDataContext` gained `addTask`, `updateTask`, `deleteTask` (also clears any
  `salerts` tied to the deleted task, matching the legacy inline delete handler), and
  `cycleTaskStatus(id)` — the most involved of the four: it advances status differently for
  "needs a return" activities vs. simple ones, and on reaching "done" for an activity that
  requires a session report (`AK[].r`), pushes a new pending `salerts` entry (unless one
  already exists unanswered); moving away from "done" removes any unanswered alert it
  created. This exactly ports `cycleTask` (`public/legacy-app.js:3226-3242`).
- `DayBoardPage` reads both the selected date and the person filter from URL search params
  (`?d=`, `?person=`), same pattern as every other stateful view in this migration —
  bookmarkable, and the prev/next-day buttons are just search-param updates.

**Routing**
- `/day` — no permission gate (matches legacy; everyone with app access can view the board).
- `/tasks/new`, `/tasks/:tid/edit` → `TaskFormPage`, under `<PermissionRoute requires="tasks">`.

**Permissions**
- `can('tasks')` gates the FAB (new task) and the form routes.
- `can('deleteItems')` gates a task's delete button.
- Non-admin users get a fixed "assigned to you" read-only line instead of the person picker
  in `TaskFormPage`, matching `rNTask`'s `admin`-gated picker (`public/legacy-app.js:3251-3260`).
- `can('team')` gates the "Informe equipo" button (forward-link, Phase 5).

**Notable decisions / deviations from the legacy behavior**
- None — this feature ported closely to the legacy behavior, including the slightly odd but
  intentional detail that in the single-person-filtered view, the group header is still
  clickable and navigates to that same person's day view (`public/legacy-app.js:3185`).

**Known gaps / follow-ups**
- The day board's "Orden inteligente" (Smart Order, Phase 7), "Plantilla" (Templates, later
  in this phase), "Informe equipo" and per-member day view (both Phase 5) buttons are
  forward-links to routes that don't exist yet — same deferred-link pattern used throughout
  this migration. They'll resolve as those phases land.
