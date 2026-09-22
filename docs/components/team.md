# Team

## Overview

Team roster management: add/edit/delete team members with per-member granular permissions,
invite a member to link their own login to a specific team-member profile, a monthly
absence/rest calendar, a per-member daily task view, and an AI-generated team activity
report. Ported from `public/legacy-app.js:3279-3486` (`rTeam`, `rMF`, the absence calendar,
`rMD`, `rTR`/`genTR`) plus `createMemberInvite` (`public/legacy-app.js:737-767`).

## Implementation

**Component tree**
```
src/features/team/
  TeamMemberFormPage.jsx   — /team/new, /team/:mid/edit, ports rMF
  TeamPage.jsx               — /team, ports rTeam
  teamCalendarHelpers.js      — pure month/color helpers
  TeamCalendarPage.jsx          — /team/calendar, ports rTeamCalendar
  MemberDayPage.jsx              — /team/:mid/day, ports rMD (reuses tasks/TaskCard)
  TeamReportPage.jsx              — /team/report, ports rTR/genTR
```

**State & data**
- `StableDataContext` gained `addTeamMember`/`updateTeamMember`/`deleteTeamMember`
  (deleting a member also nulls `pid` on any task assigned to them, matching legacy) and
  `toggleAbsence(pid, date)`.
- `StableSelectionContext` gained `createMemberInvite(member)` — it writes to the top-level
  `inviteCodes` collection, the same one `joinByCode` (Phase 1) already reads from, so it
  lives there rather than in `StableDataContext`. It takes the full member object (not an
  id) since `StableSelectionContext` has no access to `StableDataContext`'s `team` slice to
  look one up itself; `TeamPage` does that lookup and passes the object in. The "already
  linked to a user, create another code anyway?" confirmation and the clipboard/toast
  feedback are `TeamPage`'s job, not the mutator's — same split used for `deleteStable`/
  `leaveStable` (Phase 1).
- `TeamMemberFormPage` preserves the link-status fields (`uid`/`userId`/`authUid`/
  `linkedAt`/`linkedName`/`linkedEmail`) from the existing record when editing — these are
  set by the join/link flow (Phase 1's `StableSelectionContext.confirmJoinAs`), not by this
  form, and must not be clobbered by an unrelated profile edit.

**Routing**
- `/team`, `/team/new`, `/team/:mid/edit`, `/team/calendar`, `/team/report` → all under
  `<PermissionRoute requires="team">`.
- `/team/:mid/day` → **no permission gate**, matches legacy (`rMD` has no
  `requirePermissionView` call) — reachable by any authenticated user, e.g. via the day
  board's clickable group header (`docs/components/tasks.md`).

**Permissions**
- `can('team')` gates every route above except member-day.
- `TeamMemberFormPage`'s delete button has no additional `can('deleteItems')` gate, matching
  legacy (`public/legacy-app.js:3416`) — having `team` access is enough to remove a member.

**Notable decisions / deviations from the legacy behavior**
- `genTR`'s direct client-side Anthropic fetch call is ported exactly as legacy has it —
  see `docs/components/reports.md` (Phase 8) for the shared reasoning on why this isn't
  silently "fixed" here.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
