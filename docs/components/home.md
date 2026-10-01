# Home

## Overview

The landing dashboard after selecting a stable: a time-of-day greeting, an "needs attention"
banner when there are urgent items, a 4-stat summary grid, quick-action shortcuts, today's
task list, and upcoming health controls. Ported from `public/legacy-app.js:1190-1247`.

## Implementation

**Component tree**
```
src/features/home/
  HomePage.jsx     — /home, ports rHome + greetingText
```

Kept as a single component rather than pre-split into sub-pieces (the original
`REFACTOR_PLAN.md` sketch proposed `PendingTasksSummary.jsx`/`AlertsSummary.jsx`) — its
sections are small, each used exactly once, and Phase 2 already showed that speculative
sub-component boundaries decided before the real code exists tend to get thrown away.
`HomePage` does reuse two components built earlier in this phase for exactly this purpose:
`TaskCard` (tasks/day board) for today's task list, and `AlertCard` (alerts) for upcoming
health controls.

**State & data**
- No new `StableDataContext` mutators — this is a read-only dashboard. It reads `tasks`,
  `horses`, `trainings`, `expenses`, `health`, `sessionAlerts` directly and derives everything
  else (today's visible tasks, health/session alert counts, worked-horse count,
  pending-expense count, progress percentage) with the same helpers `DayBoardPage`/
  `AlertsPage` already use (`useTaskOccurrences`, `visibleTasksForUser`,
  `upcomingHealthAlerts`, `pendingSessionAlerts`, `visibleAlertsForUser`).
- "Tareas de hoy" now resolves through `useTaskOccurrences`, same as `DayBoardPage` — so it
  includes general stable chores (not just horse tasks, closing the gap where the old
  `ctasks` never appeared on the home dashboard at all) and any recurring task's occurrence
  for today, with its per-date status if one was already recorded.
- Reads `AuthContext` (for greeting name), `StableSelectionContext` (for the active stable's
  name shown in the hero), and `ModalContext` (for the "Más opciones" button).

**Routing**
- `/home` — no permission gate, matches legacy (the landing page after auth+stable selection).

**Permissions**
- `can('health')`/`can('expenses')` gate whether health alerts / pending-expense count are
  computed at all (matches `rHome`'s own `canPerm(...)` guards, not just a display filter).
- `can('trainings')`, `can('tasks')`, `can('horses')` each gate one quick-action button.

**Quick-action customization**
- The quick-actions grid is no longer hardcoded JSX — it's driven by `QUICK_ACTION_CATALOG`
  (`src/features/home/homeShortcuts.js`), filtered through `visibleQuickActions(ctx,
  enabledIds)`: each item's `isAvailable(ctx)` permission check always applies (same as
  before), and `enabledIds` (the user's saved `profile.quickActions`, from `docs/components/
  profile.md`'s "Personalizar inicio" card) additionally filters to just the shortcuts they
  chose to keep — `null`/unset means "show everything available," i.e. today's behavior
  unchanged for anyone who hasn't customized it. "Más opciones" is `alwaysOn` and not
  user-hideable.

**Notable decisions / deviations from the legacy behavior**
- None — a close, direct port, plus the quick-actions catalog extraction described above.

**Known gaps / follow-ups**
- None — all forward-links this page pointed at (Boards, the More panel, Stats) now resolve;
  see `docs/components/boards.md`, `docs/components/profile.md`, `docs/components/stats.md`.
