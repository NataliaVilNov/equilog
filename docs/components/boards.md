# Boards ("Pizarras")

## Overview

Whole-stable scheduling boards: a weekly plan of activities per horse per day, plus two
resource boards (walker/"caminador" and paddocks) where horses scheduled for those
activities get dragged (or tapped, on touch) into a specific time slot, and a config screen
for customizing activities, periodic columns, walkers, and paddocks. Also includes a
per-column "periodic" tracker (herraje/desparasitación/dientes-style recurring controls)
shown as colored due-date pills next to the weekly grid. Ported from
`public/legacy-app.js:1254-1489`.

## Implementation

**Component tree**
```
src/features/boards/
  boardDefaults.js              — pure default boardConfig shape
  boardHelpers.js                 — pure selectors/matching helpers, explicit-param
  BoardsPage.jsx                    — /boards, tab shell (weekly/walker/paddock/config)
  weekly/
    QuickAssignToolbar.jsx           — the quick-assign activity picker
    PeriodicColumnCell.jsx            — one periodic-column cell + its date-edit prompt
    WeeklyBoardGrid.jsx                — the horse×day grid, "Principal" tab
    BoardCellPage.jsx                  — /boards/cell/:hid/:date, per-horse/day order editor
  resource/
    PendingHorseTray.jsx              — unplaced-horses tray (drag source + tap-to-pick)
    ResourceSlot.jsx                    — one droppable/clickable slot cell
    ResourceBoardPage.jsx                — walker/paddock tab body, drag-and-drop + tap flow
  config/
    BoardConfigPage.jsx                — config tab shell: activities + periodic columns
    WalkersConfig.jsx                    — walker CRUD + inline slot editing
    PaddocksConfig.jsx                    — paddock CRUD + shared paddock-slot editing
    SlotListEditor.jsx                    — controlled {id?,start,end}[] array editor,
                                             shared by WalkersConfig and PaddocksConfig
```

**State & data**
- Four `StableDataContext` collections: `boardConfig` (an object — the only non-array
  collection in this context — defaulting from `boardDefaults()`), `weeklyPlans[]`,
  `periodicBoardDates[]`, `boardAssignments[]`.
- Mutators: `setWeeklyPlanActivities`/`toggleWeeklyPlanActivity` (weekly plan),
  `setBoardPeriodic` (periodic columns), `assignBoardHorse`/`moveBoardAssignment`/
  `removeBoardAssignment` (resource-board placements), and CRUD mutators for every
  `boardConfig` sub-collection (activities, periodic columns, walkers, paddocks, paddock
  slots).
- Unlike most mutators elsewhere in this app, `assignBoardHorse`/`moveBoardAssignment`
  don't call `toast()`/`confirm()` themselves — they return `{status: "ok"|"occupied"|
  "conflict"}` (or throw for a plain validation error, same convention as
  `StableSelectionContext`) so the calling component decides how to surface an occupied
  cell or a scheduling conflict. `ResourceBoardPage` re-calls the mutator with `{force:
  true}` after the user confirms a conflict warning.

**Routing**
- `/boards` (reads `?tab=weekly|walker|paddock|config`, `?week=` for the weekly tab,
  `?date=` for the walker/paddock tabs) and `/boards/cell/:hid/:date` (reads `?week=` for
  its back-link) — **no permission gate**, matches legacy exactly (see below).

**Permissions**
- None. Legacy's own permission-gate block (`public/legacy-app.js:1497-1507`) never
  mentions `'boards'`/`'boardCell'`, and no `defaultTeamPermissions()` key exists for this
  feature — adding one would be a schema change beyond this refactor's scope, so Boards
  stays reachable by any authenticated team member, as-is.

**Notable decisions / deviations from the legacy behavior**

| Change | Fixed or preserved | Why |
| --- | --- | --- |
| `moveBoardAssignment` skipping the `horseConflict` check `assignBoardHorse` has | **Fixed** | One-line consistency fix — dragging an already-placed horse into a time-overlapping slot now shows the same warning a fresh placement of that horse into the same slot would. |
| `editWalker`/`promptSlots` regenerating every slot's id on every edit | **Fixed structurally** | Slot editing is a real per-row array editor (`SlotListEditor.jsx`) instead of "retype the whole list as text" — existing rows keep their id, only genuinely new rows get one, so `boardAssignments` referencing existing slots are never silently orphaned. |
| No cascade cleanup of `weeklyPlans`/`periodicBoardDates` when an activity/periodic-column is deleted | Preserved | Legacy's own confirm-dialog text acknowledges "las fechas guardadas dejarán de mostrarse" — this is an intentional, accepted-tradeoff design, not a bug. |
| `horseConflict`'s `a.slotId!==slotId` exclusion can mask a conflict between two different paddocks sharing the same slot id | Preserved | A real edge case in the data model (paddocks share one global slot-id list), documented here but not fixed — out of scope for a faithful port. |
| Paddock `capacity` field exists but never drives multiple columns the way walker `capacity` does | Preserved | Matches legacy's `rResourceBoard`, which always renders paddocks as a single column regardless of `capacity`. |
| The activity-order editor (`BoardCellPage`) uses real array state with up/down buttons instead of reading DOM node order at save time | Mechanical adaptation, not a behavior change | There's no React-idiomatic equivalent of "read the final order from the DOM" — legacy's `saveBoardCell` does exactly that via `querySelectorAll`. |
| `addPaddockSlot`/`addBoardActivity`/etc. take explicit form fields instead of `prompt()` | Mechanical adaptation | Matches the real-form pattern used for every other "add X" flow in this migration; `window.confirm()` is still used for deletes, matching every other destructive action ported so far. |

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
