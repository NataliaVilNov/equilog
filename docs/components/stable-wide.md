# Stable-wide ("Cuadra")

## Overview

Shared costs not tied to a specific horse (material, payroll, maintenance, supplies). Ported
from `public/legacy-app.js:2213-2342` (`rCuadra`, `rNCE`). Recurring stable-wide *tasks*
(cleaning, laundry, etc.) used to live here too (`rNCT`/`doneCT`) but moved into the unified
tasks feature — a general chore is now just a task with no `horseId`, optionally recurring —
see `docs/components/tasks.md` and `docs/DATABASE.md` §7 for why.

## Implementation

**Component tree**
```
src/features/stable-wide/
  StableExpenseList.jsx           — expense list content
  StableWidePage.jsx               — /cuadra, now just hosts the expense list directly
  StableExpenseFormPage.jsx          — /cuadra/expenses/new, /cuadra/expenses/:eid/edit,
                                        ports rNCE
```

**State & data**
- Stable-wide expenses live at `stables/{stableId}/stableExpenses/{expenseId}` (moved off
  the single-document-per-stable model, and renamed from `cexpenses` for clarity against the
  per-horse `expenses` subcollection — see `docs/DATABASE.md`). `StableDataContext` gained
  `addStableExpense`/`updateStableExpense`/`deleteStableExpense` for it.

**Routing**
- `/cuadra`, `/cuadra/expenses/new`, `/cuadra/expenses/:eid/edit` — all under
  `<PermissionRoute requires="stable">`.

**Permissions**
- `can('stable')` gates every route in this feature.
- Unlike most other delete buttons ported so far (which also check `can('deleteItems')`),
  the delete button here has **no** additional gate — matches legacy exactly
  (`public/legacy-app.js:2273`): having `stable` access alone is enough to delete a
  stable-wide expense.

**Notable decisions / deviations from the legacy behavior**
- The "tareas"/"gastos" tab switcher is gone along with the tasks tab — with only expenses
  left here, a single list replaces the two-tab shell.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
