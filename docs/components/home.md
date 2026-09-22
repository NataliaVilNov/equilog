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
  `horses`, `trainings`, `expenses`, `health`, `salerts` directly and derives everything else
  (today's visible tasks, health/session alert counts, worked-horse count, pending-expense
  count, progress percentage) with the same helpers `DayBoardPage`/`AlertsPage` already use
  (`tasksForDate`, `visibleTasksForUser`, `upcomingHealthAlerts`, `pendingSessionAlerts`,
  `visibleAlertsForUser`).
- Reads `AuthContext` (for greeting name), `StableSelectionContext` (for the active stable's
  name shown in the hero), and `ModalContext` (for the "Más opciones" button).

**Routing**
- `/home` — no permission gate, matches legacy (the landing page after auth+stable selection).

**Permissions**
- `can('health')`/`can('expenses')` gate whether health alerts / pending-expense count are
  computed at all (matches `rHome`'s own `canPerm(...)` guards, not just a display filter).
- `can('trainings')`, `can('tasks')`, `can('horses')` each gate one quick-action button.

**Notable decisions / deviations from the legacy behavior**
- None — a close, direct port.

**Known gaps / follow-ups**
- None — all forward-links this page pointed at (Boards, the More panel, Stats) now resolve;
  see `docs/components/boards.md`, `docs/components/profile.md`, `docs/components/stats.md`.
