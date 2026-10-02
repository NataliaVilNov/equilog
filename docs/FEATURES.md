# EquiLog — Feature Documentation

This document describes every feature currently implemented in EquiLog, as it exists today in
`public/legacy-app.js` (the file actually served by `index.html` — see
[DATABASE.md](./DATABASE.md) and [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) for why
`src/legacy-app.js` is a stale, unused duplicate).

All line numbers refer to `public/legacy-app.js` on branch `refactor/react-migration`. The app
is Spanish-language; feature names below are translated for this doc, but UI strings in the
codebase are Spanish.

---

## 1. Authentication

**What it does**: Email/password login and registration via Firebase Auth, with a tabbed
auth screen (Entrar / Registrarse). Drives the entire app's boot sequence — `onAuthStateChanged`
in `src/firebase.js` decides whether to show the auth screen, the stable selector, or the
main app.

- Entry points: `authTab()`, `doLogin()`, `doRegister()`, `doLogout()`, `fbErrMsg()` (lines ~13–63)
- Data: writes/reads `users/{uid}` profile doc (not part of the per-stable data blob)
- Quirks: auth errors are mapped from Firebase error codes to Spanish messages via `fbErrMsg()`

## 2. Multi-stable management

**What it does**: A user can belong to multiple "stables" (cuadras). List stables, create a
new one, join an existing one via invite code, switch the active stable, delete a stable
(owner only), or leave one.

- Entry points: `renderStableList()`, `window._fbSwitchStable()`, `_fbLoadData()`,
  `_fbSetupListener()`, `showCreateStable()`/`doCreateStable()`, `joinByCode()`,
  `deleteStable()`, `leaveStable()` (lines ~329–876)
- Data: `stables/{stableId}` metadata doc (name, description, invite code, team refs) +
  `stables/{stableId}/data/main` (the full per-stable dataset, see DATABASE.md)
- Quirks: switching stables tears down and re-attaches the Firestore `onSnapshot` listener;
  the user's `lastStable` is persisted on their profile so login goes straight to their last
  active stable.

## 3. Team & permissions

**What it does**: Each stable has a team member roster. Members can be linked to an
authenticated user account (via invite code + "which member are you" linking flow) and are
granted a granular permission set: `horses, trainings, tasks, expenses, health, reports,
stats, team, stable, sale, deleteItems`. Stable admins always have full access.

- Entry points: `rTeam()`, `defaultTeamPermissions()` (~653), `canPerm()` (~673),
  `isStableAdmin()`, `myPermissions()` (~668), `requirePermissionView()`,
  `requireAdminView()`, `applyNavPermissions()`, `linkUserToTeamMember()`,
  `showJoinTeamModal()`/`confirmJoinAs()` (lines ~329–876, ~3279–3444)
- Data: `team` array in the stable data doc
- Quirks: permission checks (`canPerm`) are called pervasively throughout rendering — nearly
  every other feature below is gated by a call into this system. This is the single most
  cross-cutting piece of logic in the app.

## 4. User profile

**What it does**: Edit display name and profile photo/avatar (upload a photo, client-side
resized, or pick an emoji avatar).

- Entry points: `window._fbLoadUserProfile()`, `profilePhoto()`, `profileInitial()`,
  `openUserPanel()`/`closeUserPanel()`, `resizeProfileImageFile()`,
  `previewUserProfilePhoto()`, `removeUserProfilePhoto()`, `saveUserProfile()` (lines ~108–328)
- Data: `users/{uid}` profile doc
- Quirks: photo is resized client-side before upload to keep the profile doc small.

## 5. Home dashboard

**What it does**: Landing screen after selecting a stable — a time-of-day greeting, today's
pending tasks, count of horses worked recently, health alerts, and a pending-payments summary.

- Entry point: `rHome()` (~1190, `greetingText()` alongside it)
- Data: reads across `tasks`, `health`, `trainings`, `expenses`/`cexpenses`
- Quirks: this feature (and the entire Boards feature below) exists **only** in
  `public/legacy-app.js`; it was never backported to the stale `src/legacy-app.js` duplicate.

## 6. Horse roster (CRUD)

**What it does**: List/search all horses in the stable; add, edit, or delete a horse
(name, breed, date of birth, pedigree fields, photo, multi-owner ownership splits).

- Entry points: `rList()`, `rHF()`, `delHorse()`, `rHorse()` (lines ~1539–1975)
- Data: `horses` array (each horse holds `owners[]` with percentage splits, pedigree fields
  `sire/dam/gsire/gdam/mgsire/mgdam`, photo as a base64 data URL, sale info)
- Quirks: `rHorse()` is the single largest per-feature function in the file — a 4-tab detail
  view (training / health / expenses / sale) computed and rendered in one pass regardless of
  which tab is active. See REFACTOR_PLAN.md §5A for the proposed component split.

## 7. Horsetelex pedigree import

**What it does**: Import a horse's pedigree (sire/dam/grandparents), name, studbook (as
`breed`), breeder (as `origin`) and Horsetelex link from a horsetelex.com horse page. The legacy
app fetched the URL from the browser; the React app no longer fetches anything (see
`docs/components/horses.md`): the user pastes the page's source code, or copies it with a
bookmarklet, and the data is read client-side.

- Entry points: `importHorsetelex()`, `fetchHorsetelexHtml()`, `manualHorsetelexPaste()`,
  `applyPedigree()`, `extractHorsetelexFromHtml()` (lines ~2576–2745)
- Data: writes pedigree fields onto a `horses` entry
- Quirks: `fetchHorsetelexHtml()` is a direct client-side `fetch()` to an external domain with
  no proxy — fragile against CORS policy changes on horsetelex.com's side (see BACKLOG.md).

## 8. Training log

**What it does**: Record training sessions per horse — type of work, duration, rating, notes.

- Entry point: `rNT()` (lines ~1975–2145, "entrenos" tab of `rHorse`)
- Data: `trainings` array, each entry keyed by horse id

## 9. Health records

**What it does**: Record health events per horse (vaccination, farrier, deworming, vet visit,
etc.) with next-due dates for recurring care, plus attach documents/photos to a record via
Firebase Storage.

- Entry points: `rNH()`, `healthDocCard()`, `uploadFileWithProgress()`, `uploadHealthDocs()`,
  `deleteHealthDoc()`, `catFromHealthType()` (lines ~1190–1489, ~1975–2145)
- Data: `health` array (type, date, `nxt` next-due date, amount, payee, payment status) +
  `healthDocs` array (Firebase Storage refs)
- Quirks: adding certain health record types auto-generates a linked entry in `expenses`
  (e.g. a farrier visit with a cost creates its own expense row).

## 10. Expenses & owner settlement

**What it does**: Record per-horse expenses and split the cost among multiple owners by
percentage; track which owners have paid/settled and generate a settlement summary.

- Entry points: `rNE()`, `deleteExpense()`, `rExpenseSettlement()`, `expSplitsForDisplay()`,
  `splitAmount()`, `expenseSplitSummary()`, `defaultExpenseSplitsForHorse()`,
  `syncSplitAmounts()`, `ownerListForHorse()`, `calcOwnerSettlement()`,
  `renderSettlementPreview()`, `confirmExpenseSettlement()` (lines ~877–1189, ~1975–2213)
- Data: `expenses` array, cross-referencing `horses[].owners`

## 11. AI-generated training reports

**What it does**: Generate a narrative summary report of a horse's training history using
an LLM, exportable to PDF.

- Entry points: `rRep()`, `genRep()` (lines ~2145–2213), `expPDF()` (jsPDF, loaded via CDN
  `<script>` in `index.html`)
- Data: reads `trainings` for the horse; writes nothing back
- Quirks: `genRep()` calls `https://api.anthropic.com/v1/messages` directly from the browser
  with **no visible API key or auth header** in the code — this feature is likely already
  broken in production, and calling a paid LLM API directly from client code is unsafe
  regardless (see BACKLOG.md — needs a server-side proxy, not a client-exposed key).

## 12. Stable-wide tasks & expenses ("Cuadra")

**What it does**: Tasks and expenses that aren't tied to a specific horse — general stable
upkeep, shared costs.

- Entry points: `rCuadra()`, `doneCT()`, `rNCT()`, `rNCE()` (lines ~2213–2404)
- Data: `ctasks` (stable tasks) and `cexpenses` (stable expenses) arrays

## 13. Alerts / session alerts

**What it does**: Surfaces items needing a response — overdue health due-dates and
unanswered "session" reports — as a dedicated alerts list, with a per-alert answer flow.

- Entry points: `rAlerts()`, `scard()`, `rAns()` (lines ~2213–2404)
- Data: `salerts` array, cross-referencing `health`/tasks
- Quirks: which alerts a user sees is filtered through `visibleAlertsForUser()` (permission
  system, see feature 3).

## 14. Stats dashboard

**What it does**: Aggregate statistics across the stable — training volume, expense totals,
health event counts, etc.

- Entry point: `rStats()` (lines ~2404–2576, ~170 lines of aggregation + rendering combined)
- Data: reads across all collections; writes nothing

## 15. Smart Order (free-text task parser)

**What it does**: Paste a free-text instruction (e.g. a WhatsApp-style message like "Lucero y
Trueno 30 min trote mañana, avisar a Marta") and the app fuzzy-parses it into structured
draft tasks/health/expense records — matching horse names, people, dates, durations, and
amounts — for review and one-click confirmation.

- Entry points: `smartAnalyzeOrder()`, `soSplitSmartClauses()`, `soDateFromText()`,
  `soDuration()`, `soAmount()`, `soTeamKeys()`, `soPerson()`, `soHorseKeys()`,
  `soAllHorseMatches()`, `soFindHorseSegments()`, `soActivities()`, `soHealth()`,
  `soBulkHorseSelection()`, `renderSmartReview()`, `confirmSmartOrder()`, `rSmartOrder()`
  (lines ~2745–3013)
- Data: writes to `tasks`/`health`/`expenses` on confirmation
- Quirks: the `so*` helper functions are already close to pure string/data functions with no
  DOM coupling — the best existing candidate for unit testing today, and the first thing
  worth extracting verbatim in the React port (see REFACTOR_PLAN.md §5C).

## 16. Daily task board ("Hoy")

**What it does**: Per-day list of tasks across all horses, with a tap-to-cycle status control
(pending → in progress → done, or similar) and quick task creation.

- Entry points: `rDay()`, `taskNeedsReturn()`, `taskStatusIcon()`/`taskStatusLabel()`,
  `tcard()`, `cycleTask()`, `rNTask()` (lines ~3127–3279)
- Data: `tasks` array

## 17. Team calendar / absences

**What it does**: Monthly calendar view of team member absences, with color-coding per
member.

- Entry points: `monthStartStr()`, `addMonth()`, `monthLabel()`, `absenceFor()`,
  `memberColor()`/`memberColorSoft()`, `toggleAbsence()`, `rTeamCalendar()`
  (lines ~3279–3444)
- Data: `absences` array

## 18. Team member day view & team report

**What it does**: View a single team member's tasks for a given day; generate an
AI-summarized team activity report (same Anthropic-API caveat as feature 11).

- Entry points: `rMD()`, `rTR()`, `genTR()` (lines ~3279–3444)
- Data: reads `tasks`/`absences` filtered by member and date

## 19. Task templates

**What it does**: Save a reusable set of tasks as a template and apply it to a given day in
one action.

- Entry points: `rTpls()`, `applyTpl()`, `rETpl()`, `addTT()`, `saveTpl()`
  (lines ~3444–3617)
- Data: `templates` array

## 20. Weekly / resource "Boards" (pizarras)

**What it does**: The most recently added feature (documented in the pre-existing README.md).
Three sub-boards under one tabbed screen:
- **Weekly board**: one row per horse × one column per day, quick-assign activities via
  click, plus configurable "periodic" columns (farrier, deworming, teeth, etc.) tracking due
  dates with color-coded status.
- **Resource boards (walker / paddock)**: a daily view of configurable time-slotted
  resources; horses are assigned to a slot either via drag-and-drop (desktop) or tap-to-select
  (mobile), with conflict detection if a horse is double-booked.
- **Board configuration**: admin screen to define activities, walkers, paddocks, and periodic
  columns.

- Entry points: `boardDefaults()`, `ensureBoardData()`, `boardActivity()`,
  `boardStartOfWeek()`/`boardWeekDates()`, `boardPlan*()`, `boardPeriodicValue()`, `rBoards()`,
  `rWeeklyBoard()`, `rResourceBoard()`, `boardDragHorse()`, `boardDrop()`,
  `assignBoardHorse()`, `moveBoardAssignment()`, `removeBoardAssignment()`, `rBoardConfig()`,
  `addBoardActivity()`, `addWalker()`, `addPaddock()`, `promptSlots()` (lines ~1190–1489)
- Data: board config + assignments stored within the stable data doc (not a separate
  top-level array in `load()` — populated/defaulted lazily by `ensureBoardData()`)
- Quirks: uses native HTML5 drag-and-drop (`dataTransfer`) plus a manual tap-to-select
  fallback for touch devices; conflict detection logic lives inline in the drop handlers.

## 21. Horse sale / ownership split editing

**What it does**: A dedicated sub-form (the "venta" tab on a horse) for editing sale price
and adjusting the multi-owner percentage split.

- Entry points: `saleUpdate()`, `saleOwnerUpdate()`, `saleAddOwner()`/`saleRemoveOwner()`,
  `hfAddOwner()`/`hfRemoveOwner()`/`hfCheckPct()` (lines ~3559–3617)
- Data: sale fields + `owners[]` on a `horses` entry

---

## Cross-cutting: form submission wiring

`attach()` (lines ~3617–3731) is not a feature itself but wires up the save-button click
handler for essentially every form above (horse, training, health, task, member,
stable-task, stable-expense, session-answer, expense) via `getElementById`, re-run after
every `render()`. In the React port this function disappears entirely — React's own event
binding replaces it (see REFACTOR_PLAN.md).
