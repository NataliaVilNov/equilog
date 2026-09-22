# Stable-wide ("Cuadra")

## Overview

Tasks and expenses that aren't tied to a specific horse — general stable upkeep (recurring
tasks like cleaning or laundry, with a frequency and an optional assignee) and shared costs
(material, payroll, maintenance, supplies). Ported from `public/legacy-app.js:2213-2342`
(`rCuadra`, `rNCT`, `rNCE`, `doneCT`).

## Implementation

**Component tree**
```
src/features/stable-wide/
  stableTaskHelpers.js         — pure ctasksDueToday(), ports cDue()
  StableTaskList.jsx             — "tareas" tab content
  StableExpenseList.jsx           — "gastos" tab content
  StableWidePage.jsx               — /cuadra, tab shell over the two lists above
  StableTaskFormPage.jsx            — /cuadra/tasks/new, /cuadra/tasks/:eid/edit, ports rNCT
  StableExpenseFormPage.jsx          — /cuadra/expenses/new, /cuadra/expenses/:eid/edit,
                                        ports rNCE
```

**State & data**
- `StableDataContext` gained `addStableTask`/`updateStableTask`/`deleteStableTask`/
  `doneStableTask` (sets `ld` — last-done date — to today, ports `doneCT`) for the `ctasks`
  collection, and `addStableExpense`/`updateStableExpense`/`deleteStableExpense` for
  `cexpenses`.
- `StableTaskFormPage` preserves the existing record's `ld` field when editing (a name/
  frequency/assignee edit shouldn't reset when the task was last marked done), matching
  legacy's `ld:ex?ex.ld:null` (`public/legacy-app.js:3692`).
- `ctasksDueToday()` (the "which recurring tasks are due today" logic, based on frequency
  and `ld`) is pure and shared between the due-today banner and each task row's "toca hoy"
  badge, same as legacy's single `cDue()` call.

**Routing**
- `/cuadra` (reads `?tab=tareas|gastos`), `/cuadra/tasks/new`, `/cuadra/tasks/:eid/edit`,
  `/cuadra/expenses/new`, `/cuadra/expenses/:eid/edit` — all under
  `<PermissionRoute requires="stable">`.

**Permissions**
- `can('stable')` gates every route in this feature.
- Unlike most other delete buttons ported so far (which also check `can('deleteItems')`),
  the delete buttons here have **no** additional gate — matches legacy exactly
  (`public/legacy-app.js:2253,2273`): having `stable` access alone is enough to delete a
  stable-wide task or expense.

**Notable decisions / deviations from the legacy behavior**
- None — a close, direct port.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
