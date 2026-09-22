# Alerts

## Overview

Surfaces items needing a response: overdue and upcoming (≤14 days) health due-dates, and
pending session reports for activities that require one (created by cycling a task like
"monta" to done — see `docs/components/tasks.md`). Answering a session report creates a
training record from it. Ported from `public/legacy-app.js:2345-2401`.

## Implementation

**Component tree**
```
src/features/alerts/
  alertSelectors.js       — pure upcomingHealthAlerts/pendingSessionAlerts/
                             visibleAlertsForUser, no DOM/global reads
  AlertCard.jsx             — one health-due-date alert row, also reused by HomePage (Phase 4c)
  AlertsPage.jsx              — /alerts, ports rAlerts
  AnswerSessionPage.jsx        — /alerts/:aid/answer, ports rAns
```

**State & data**
- `StableDataContext` gained `answerSessionAlert(alertId, sessionData)` — ports the
  `save-session-btn` handler (`public/legacy-app.js:3706-3712`): pushes a new `trainings`
  record built from the session report (using the alert's own `hid`/`date`/`act`, with
  `wtype` set to `"longe"` only when the alert's activity was longe, `"doma"` otherwise —
  matching legacy exactly) and marks the `salerts` entry `ans: true`, both in one state
  update.
- `visibleAlertsForUser` is a pure, explicit-param version of the legacy global — it takes
  `isAdmin`/`myTeamMemberId` as arguments instead of calling `isStableAdmin()`/
  `myTeamMemberId()` itself, so `AlertsPage` supplies them from `usePermissions()`.

**Routing**
- `/alerts`, `/alerts/:aid/answer` — no permission gate, matching legacy (`rAlerts`/`rAns`
  have no `requirePermissionView` call; every user with app access can see their own alerts).

**Permissions**
- Health due-date alerts (`upcomingHealthAlerts`) are admin-only, matching legacy's
  `isStableAdmin()?sanA():[]` — a regular team member sees only their own pending session
  reports, never the stable-wide health due-date list.
- Session-report alerts are filtered to the current user unless they're admin
  (`visibleAlertsForUser`).

**Notable decisions / deviations from the legacy behavior**
- None — this is a small, direct port.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
