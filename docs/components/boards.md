# Boards ("Pizarras")

## Overview

Whole-stable scheduling boards: a weekly plan of activities per horse per day, plus two
resource boards (walker/"caminador" and paddocks) where horses scheduled for those
activities get dragged (or tapped, on touch) into a specific time slot, and a config screen
for customizing activities, periodic columns, walkers, and paddocks. Also includes a
per-column "periodic" tracker (herraje/desparasitación/dientes-style recurring controls)
shown as colored due-date pills next to the weekly grid. Ported from
`public/legacy-app.js:1254-1489`.

The **Weekly tab** was later reworked (not a legacy port) to feel like a separate reference
implementation the team built, `EquiLog_pizarra_semanal_codigo` — a single always-present
toolbar of activities plus 4 fixed utility tools (Nota/Hecho/Copiar/Borrar), one active at a
time, governs what tapping a cell does. The resource boards, periodic columns, and the rest
of the config screen were explicitly out of scope for that rework — the reference app has no
equivalent for any of them — and remain exactly as described below. A **Month tab** was added
after that rework, purely as an EquiLog addition — the reference app has no month view at
all, only weekly.

## Implementation

**Component tree**
```
src/features/boards/
  boardDefaults.js              — pure default boardConfig shape (includes the "vet" activity)
  boardHelpers.js                 — pure selectors/matching helpers, explicit-param
  BoardsPage.jsx                    — /boards, tab shell (weekly/month/walker/paddock/config)
  weekly/
    BoardToolbar.jsx                  — activities + Nota/Hecho/Copiar/Borrar, one tool armed
    BoardCell.jsx                      — one grid cell: codes, done state, note, VET badge
    NoteSheet.jsx                       — the "Nota" tool's cell sheet
    DoneChecklistSheet.jsx               — the "Hecho" tool's per-activity checklist sheet
    VetDetailSheet.jsx                    — the VET second-tap detail sheet
    PeriodicColumnCell.jsx                 — one periodic-column cell + its date-edit prompt
    WeeklyBoardGrid.jsx                     — the horse×day grid + tool dispatch, "Principal" tab
    BoardCellPage.jsx                       — /boards/cell/:hid/:date, secondary full
                                               chronological-order editor (linked from the
                                               Done sheet)
  month/
    MonthBoardGrid.jsx                — month-at-a-glance, "Mes" tab (?tab=month)
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
src/features/horses/horseOrder.js — sortHorsesByOrder(), the shared horse ordering used by
                                     both the horse list and the weekly board's rows
src/components/SlideUpSheet.jsx   — the bottom-sheet backdrop/panel chrome the three new
                                     board sheets (and MorePanel before them) are built on
```

**State & data**
- Four `StableDataContext` collections: `boardConfig` (an object — the only non-array
  collection in this context — defaulting from `boardDefaults()`), `weeklyPlans[]`,
  `periodicBoardDates[]`, `boardAssignments[]`.
- `weeklyPlans[]` rows: `{id, hid, date, activities: string[], completed: string[], note:
  string, vetHealthId: string|null}`. The last three fields were added for the weekly-board
  rework (not a legacy port) — `completed` is a subset of `activities` marked done,
  `vetHealthId` links a cell's VET flag to a real `health[]` record (see below). Stables
  created before this rework get these fields defaulted at read time in `withDefaults`
  (`StableDataContext.jsx`), same treatment as every other optional field there. Existing
  stables also get the `boardConfig.activities` list backfilled with a new default `vet`
  entry the same way, since `boardDefaults()` only seeds brand-new stables.
- Mutators: `setWeeklyPlanActivities`/`toggleWeeklyPlanActivity` (weekly plan activities,
  unchanged by the rework), `setWeeklyPlanNote`, `toggleWeeklyPlanCompleted`,
  `pasteWeeklyPlanContent` (copy/paste, single-cell or batched to a whole day/horse-row),
  `repeatPreviousWeek`, `eraseWeeklyPlanCell`, `setWeeklyPlanVetLink` (all new), plus
  `setBoardPeriodic` (periodic columns), `assignBoardHorse`/`moveBoardAssignment`/
  `removeBoardAssignment` (resource-board placements), CRUD mutators for every
  `boardConfig` sub-collection, and `reorderHorses` (new, on `horses[]` — see
  `docs/components/horses.md`).
- Unlike most mutators elsewhere in this app, `assignBoardHorse`/`moveBoardAssignment`
  don't call `toast()`/`confirm()` themselves — they return `{status: "ok"|"occupied"|
  "conflict"}` (or throw for a plain validation error, same convention as
  `StableSelectionContext`) so the calling component decides how to surface an occupied
  cell or a scheduling conflict. `ResourceBoardPage` re-calls the mutator with `{force:
  true}` after the user confirms a conflict warning.
- **VET → Health integration**: the VET tool's second tap on an already-VET-flagged cell
  opens `VetDetailSheet`. Saving calls the existing `addHealthRecord`/`updateHealthRecord`
  mutators directly (type `'otro'`, label "Revisión veterinaria" — the same convention Smart
  Order's `soHealth()` parser already uses for "veterinario" mentions), then
  `setWeeklyPlanVetLink` records which `health[]` record that cell is linked to, so editing
  the detail again updates the same record instead of creating a duplicate. `amount: 0`
  means no linked expense gets created (matches `addHealthRecord`'s existing `amount > 0`
  gate) — a board-flagged vet visit carries no cost data, unlike the full Health form. This
  is a from-scratch reimplementation of the reference app's VET flow, which instead synced
  to an external Notion database; EquiLog has no Notion integration, so it writes directly
  to its own Health feature instead.
- The Month tab is read-derived only — it reads the same `weeklyPlans[]`/`boardConfig` data
  the weekly grid does and adds no mutators or fields of its own. Its "Todos los
  caballos"/"Un caballo" mode toggle and `?month=`/`?horse=` search params mirror
  `TeamCalendarPage`'s existing `?month=`/`?pid=` pattern (`features/team/
  TeamCalendarPage.jsx`) rather than inventing a new one. Tapping a day drills into
  `BoardCellPage` for that horse+day in "one horse" mode, or into the Weekly tab for that
  day's week in "all horses" mode (there's no single cell to jump to when viewing every
  horse at once).

**Routing**
- `/boards` (reads `?tab=weekly|month|walker|paddock|config`, `?week=` for the weekly tab,
  `?month=`/`?mode=`/`?horse=` for the month tab, `?date=` for the walker/paddock tabs) and
  `/boards/cell/:hid/:date` (reads `?week=` for its back-link) — **no permission gate**,
  matches legacy exactly (see below).

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
| VET's second-tap detail flow writes to EquiLog's own Health feature | Deliberate reimplementation, not a port | The reference app syncs to an external Notion database instead — EquiLog has no such integration, and already has a real Health feature the board can write into directly. |
| Erase gets a `window.confirm()` guard when the cell isn't already empty | Deliberate deviation from the reference | The reference app erases on a single tap with no confirmation; EquiLog's own convention is to confirm destructive actions everywhere else, so Erase follows suit here too (skipped on already-empty cells to avoid a pointless prompt). |
| `BoardCellPage` kept as a secondary entry point (linked from the Done sheet) rather than deleted | Deliberate | Tap-toggling a cell's activities can only append/remove — it can't reorder two already-assigned activities relative to each other, which `BoardCellPage`'s up/down controls still do. |
| Activity editing stays on `BoardConfigPage` — no new inline toolbar editor | Deliberate | The reference app's inline gear-icon editor exists because that app has no separate settings area; EquiLog already has one (the Config tab), so duplicating it would work against this app's existing convention of dedicated config pages. |
| The VET activity id is a hardcoded literal (`"vet"`), not a generic per-activity flag | Preserved from the reference | Renaming or removing the `vet` board activity silently breaks the badge/second-tap flow — the same known limitation the reference implementation has for its own hardcoded `"VET"` string. |

## Future unification possibilities (not in scope)

Two things the weekly-board rework deliberately did **not** build, written up here per an
explicit request so a future decision has the groundwork already thought through:

**Tasks/board unification.** The board's `activities`/`completed` fields could in principle
become the source of truth the Tasks/"Hoy" feature reads from (or vice versa), so planning
and daily execution tracking live in one place instead of two. The core obstacle is a
granularity mismatch: `tasks[]` rows are one-activity-per-row with `pid`/`status`/`notes`/
`dur`/`time`, while `weeklyPlans[]` rows are one-cell-with-multiple-activities. Any real
unification has to resolve that mismatch first — likely by exploding each `weeklyPlans`
activity into its own addressable unit — and then decide what happens to
`cycleTaskStatus`'s paddock/caminador return-trip cycling and its session-report-alert-on-
done logic, neither of which the board has any concept of today.

**Person-tags on cells.** The reference app has a "Personas" tool category — tapping a
team-member code tags a cell with who's doing it, entirely independent of any assignment
system (since that app doesn't have one). EquiLog could add a parallel `people: string[]`
field to `weeklyPlans` rows with team-member-linked tool buttons reusing `team[]`. The open
design tension: this would create a second, independent "who's responsible" answer
alongside Tasks' `pid` field — a future decision would need to pick whether board
person-tags *become* the assignment mechanism (replacing `pid`) or stay purely
informational, coexisting with it.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
