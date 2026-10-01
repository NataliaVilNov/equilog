# EquiLog — React Migration Plan

## Status: migration complete

All 8 phases below have been implemented and committed on `refactor/react-migration`. The
Phase 8c cutover repointed `index.html` at the React entry (`src/main.jsx`) and deleted
`public/legacy-app.js`, `react-app.html`, `src/main.js`, and `src/firebase.js` — the vanilla-JS
monolith this document was written against no longer exists in this repo.

This document is kept as-is below as the **original planning artifact** — the actual
implementation diverged in small, expected ways as each phase was built (e.g. the Smart Order
parser modules ended up named `matching.js`/`personMatching.js`/`horseMatching.js`/
`extractors.js`/`clauseSplitting.js`/`buildDraft.js` rather than the `splitClauses.js`/
`matchHorses.js`/`extractFields.js` sketch in §2/§5C below; the Boards feature's drag logic
lives directly in `ResourceBoardPage.jsx`/`ResourceSlot.jsx` rather than a separate
`useBoardDnd.js` hook; a `profile/` feature folder was never needed since user-profile editing
stayed out of scope). For the actual, current shape of each feature, `docs/components/*.md`
is the authoritative reference — one file per feature, kept up to date as each was ported.
The remaining backlog after this migration is tracked in `docs/BACKLOG.md`; the three biggest
open items are unchanged by this migration and carry forward: the Firebase API key still
needs rotating in the Firebase console (`BACKLOG.md` #1), the AI report features still call
the Anthropic API directly from the browser with no key (`BACKLOG.md` #2, ported as
deliberate parity — see `docs/components/reports.md`), and the single-Firestore-document data
model is unchanged (`BACKLOG.md` #3) — this migration was a component/architecture
reorganization, not a data-model redesign, by design (see §3 below).

## Why this document exists

The app is a single 3,741-line vanilla-JS file (`public/legacy-app.js`) that hand-rolls its
own router, global mutable state, and DOM wiring. This document is the architecture and
phasing plan for porting it to React, feature by feature, without a giant-bang rewrite. It is
a **plan**, not code — implementation happens in future sessions, each executing one phase
below. See `FEATURES.md` for what each feature does today and `DATABASE.md` for the data
model this migration wraps but does not redesign.

## 1. Stack decision

- **Keep Vite** as the build tool — it's already in place (`vite@^7`) and there's no SSR/SEO
  requirement that would justify Next.js for a client-only app against Firebase.
- **Add**: `react`, `react-dom`, `react-router-dom` (v6).
  - `react-router-dom` replaces the hand-rolled `V`/`views` object
    (`public/legacy-app.js` ~line 1513) directly: `V.name` → route path, `V.hid`/`V.tid`/etc
    → route params, `V.tab` → a `?tab=` search param. This is a straightforward upgrade that
    also adds working browser back/forward and deep-linking for free, neither of which the
    current app has.
- **State management: React Context + hooks — not Redux/Zustand.**
  - The entire app's server state is one Firestore document synced through a single
    `onSnapshot` (see `DATABASE.md` §2). That is structurally *one* subscription with one
    consumer shape — exactly what `useContext` + a custom hook models directly, with zero new
    dependencies.
  - Redux/Zustand earn their cost when there are many independent state slices needing
    cross-cutting coordination. Here there's structurally one store (the stable doc) plus a
    handful of small UI-only concerns (modal open/closed, toast queue, current auth user).
  - If/when the data model moves to per-collection documents (see `DATABASE.md` §5 /
    `BACKLOG.md` #3), revisit — TanStack Query becomes attractive for per-collection caching
    at that point. Not needed for the current single-doc model.
- **Reuse `src/styles.css` as-is** (39KB of CSS custom properties + component classes like
  `.btn`, `.view`, `.tabs`, `.hc`, `.em`, `.sg`) rather than introducing a UI component
  library. It already encodes a complete design system; re-skinning would be pure scope creep
  for a migration whose goal is code organization, not a visual redesign.
- **Drag-and-drop (Boards feature)**: keep the existing native HTML5 DnD approach
  (`draggable`, `onDragStart`/`onDrop`) wrapped in React event handlers. No need to introduce
  `react-dnd`/`dnd-kit` — the current implementation already works natively; a library swap
  is optional future polish, not a porting blocker.

## 2. Target folder layout

```
src/
  main.jsx                       # ReactDOM.createRoot; wraps <App/> in providers
  App.jsx                        # <BrowserRouter> + route table + top-level layout
  firebase.js                    # initializeApp/getAuth/getFirestore/getStorage exports
                                  # (drop the window._FB global bridge once legacy-app.js is retired)

  routes/
    routes.jsx                   # central route definitions, one entry per view
    ProtectedRoute.jsx           # requires auth + an active stable
    PermissionRoute.jsx          # requires canPerm(key); renders an access-denied view

  contexts/
    AuthContext.jsx              # onAuthStateChanged wrapper: {user, profile, loading}
    StableSelectionContext.jsx   # active stable id/doc; switch/create/join/delete/leave
    StableDataContext.jsx        # the single onSnapshot subscription + typed slices + mutators
    ToastContext.jsx             # replaces global toast()
    ModalContext.jsx             # replaces imperative panel/modal open/close globals

  hooks/
    useStableData.js             # ergonomic re-export of useContext(StableDataContext)
    usePermissions.js            # wraps canPerm/isStableAdmin/myPermissions equivalents
    useDebouncedSave.js          # generic 250ms-debounce-then-setDoc hook
    useToast.js
    useLocalStorage.js           # offline/pre-Firebase-ready fallback path

  lib/
    firestore.js                 # doc/getDoc/setDoc/onSnapshot wrappers scoped to stables/{id}/data/main
    cleanForFirestore.js         # ports the existing recursive undefined->null sanitizer
    date.js                      # td(), dU(), fD(), fDL(), addD() ports
    permissions.js                # defaultTeamPermissions(), canManageStable(), constants
    id.js                        # uid() port
    format.js                    # money/percent formatting helpers, currently inlined ad hoc

  features/
    auth/           # LoginForm, RegisterForm, AuthScreen
    stables/        # StableListScreen, CreateStableModal, JoinByCodeForm, StablePanel, JoinTeamModal
    profile/        # UserPanel, ProfileForm, AvatarUploader
    home/           # HomePage, PendingTasksSummary, AlertsSummary
    horses/
      HorseListPage.jsx, HorseListItem.jsx, HorseSearchBar.jsx
      HorseFormPage.jsx, PedigreeFields.jsx, OwnerSplitEditor.jsx, HorsetelexImportButton.jsx
      detail/
        HorseDetailPage.jsx, HorseHeader.jsx, HorseTabs.jsx
        TrainingTab.jsx, HealthTab.jsx, ExpensesTab.jsx, SaleTab.jsx
    trainings/      # TrainingFormPage, TrainingCard
    health/         # HealthFormPage, HealthDocCard, HealthDocUploader
    expenses/       # ExpenseFormPage, ExpenseSettlementPage, useOwnerSettlement
    reports/        # TrainingReportPage, useGenerateReport, pdfExport
    team/           # TeamPage, TeamMemberFormPage, TeamPermissionsEditor, TeamCalendarPage,
                    # MemberDayPage, TeamReportPage
    tasks/          # DayBoardPage, TaskCard, TaskFormPage
    templates/      # TemplatesPage, TemplateFormPage
    stable-wide/    # StableTasksExpensesPage, StableTaskFormPage, StableExpenseFormPage ("Cuadra")
    alerts/         # AlertsPage, AnswerAlertPage
    stats/          # StatsPage
    smart-order/
      SmartOrderPage.jsx, SmartOrderReview.jsx, SmartOrderDraftItem.jsx
      parser/       # splitClauses.js, matchHorses.js, extractFields.js, buildDraft.js (pure, no DOM)
    boards/
      BoardsPage.jsx
      weekly/       # WeeklyBoardGrid, QuickAssignPanel, PeriodicColumnCell
      resource/     # ResourceBoardPage, ResourceSlot, PendingHorseList
      config/       # BoardConfigPage
      useBoardDnd.js

  components/       # generic, feature-agnostic UI
    layout/         # AppHeader, BottomNav, MorePanel, Fab
    Toast.jsx, LoadingScreen.jsx, Modal.jsx / SlideUpSheet.jsx, EmptyState.jsx
    Tabs.jsx        # generic tab renderer reused by HorseTabs, BoardsPage, Cuadra tabs
    StatGrid.jsx    # stat-tile pattern reused by HorseDetailPage, StatsPage, etc.
```

### Cross-cutting concern mapping (legacy global → React target)

| Legacy (global) | React target |
|---|---|
| `D` global object | `StableDataContext` |
| `V` + `views` lookup + `render()` | `react-router-dom` routes + local `useState`/URL search params for tab state |
| `attach()` (110-line manual DOM rewiring, ~line 3617) | **Deleted entirely** — React's own event binding replaces it. Single biggest complexity reduction in the port. |
| `canPerm`, `isStableAdmin`, `myPermissions`, `requirePermissionView`, `requireAdminView`, `applyNavPermissions`, `visibleTasksForUser`, `visibleAlertsForUser` | `usePermissions()` hook + `<PermissionRoute requires="health">` + conditional rendering in `BottomNav`/`MorePanel` |
| `save()` + `cleanForFirestore` + `_fbSetupListener`/`_fbLoadData` | Encapsulated entirely inside `StableDataContext` — no feature component talks to Firestore directly |
| `toast()` global | `ToastContext` / `useToast()` |
| `openStablePanel`/`closeStablePanel`/`openUserPanel`/`closeUserPanel`/`closeMorePanel`/`closeJoinTeamModal` | `ModalContext` with named modal keys, or local `useState` for single-consumer modals |
| `window._FBUSER`, `window._FBPROFILE`, `window._ACTIVE_STABLE*` | `AuthContext` + `StableSelectionContext` state — no `window` pollution |

## 3. Data layer design

Keep the *existing* one-document-per-stable Firestore model for this migration — do not
couple a schema redesign with the rewrite (see `BACKLOG.md` #3 for why that's tracked
separately). Wrap it behind `StableDataContext`:

- Sets up exactly one `onSnapshot(doc(db,'stables',stableId,'data','main'))` on mount/when the
  active stable changes, mirroring `_fbSetupListener` — including the
  `snap.metadata.hasPendingWrites === false` check that prevents the app from re-rendering off
  its own optimistic write before the round-trip completes.
- Does one `getDoc` first (mirrors `_fbLoadData`) so first paint isn't blocked on listener
  latency.
- Defaults missing arrays exactly as `load()` does today (`horses, trainings, health,
  healthDocs, expenses, team, tasks, ctasks, cexpenses, salerts, templates, absences`).
- Exposes **typed slices** via memoized selectors — `const { horses, trainings, ... } =
  useStableData()` — not the raw doc.
- Exposes **named mutator functions** instead of letting components mutate `D` in place:
  `addHorse`, `updateHorse`, `deleteHorse`, `addTraining`, `deleteTraining`,
  `addHealthRecord`, `uploadHealthDoc`, `addExpense`, `markExpenseSettled`, `addTask`,
  `cycleTaskStatus`, `upsertBoardAssignment`, etc. Each internally clones the relevant array
  slice, applies the change, and calls the shared debounced save — replacing the
  direct-mutate-then-`save()` pairs scattered through the legacy code with one named function
  per operation, callable from any component.
- The 250ms debounce and `cleanForFirestore` sanitizer move to `lib/`/`hooks/` as small
  focused utilities, called once from inside the context.
- The `localStorage` fallback is preserved as the context's write path when there's no active
  stable yet.

## 4. Phased migration order

Each phase ships a working, independently verifiable app. Given this is a small,
single-maintainer app (not a large team needing gradual rollout), a **hard cutover per
phase** is simplest — no need for a feature-flag split between old and new UI mid-phase.

| Phase | Scope | Why this order |
|---|---|---|
| **0 — Housekeeping** | Delete `src/legacy-app.js` (dead duplicate); add `.gitignore`; move the Firebase API key into `.env` (`VITE_FIREBASE_*`). No functional change. | Clean base to branch the rewrite from; addresses `BACKLOG.md` #1 and #5 immediately, independent of the React work. |
| **1 — Foundational infra** | `AuthContext`, `StableSelectionContext`, `StableDataContext`, `ToastContext`, `ModalContext`; `App.jsx` shell (`AppHeader`, `BottomNav`, `Fab`, `LoadingScreen`, `Toast`); routing skeleton; port auth screens + multi-stable management (create/join/switch/delete/leave) + `usePermissions`. | Highest-risk phase — proves the Context+`onSnapshot` pattern end-to-end before any feature depends on it. Everything else builds on this. |
| **2 — Horse roster (reference pattern)** | `HorseListPage`, `HorseFormPage` (+ `OwnerSplitEditor`, `HorsetelexImportButton`), `HorseDetailPage` with all 4 tabs. | Deliberately chosen next because it exercises every pattern the rest of the app needs: list+search, permission-gated CRUD, tabbed detail view, nested sub-resources, file upload, external-data import. Once solid, later features are "more of the same shape." |
| **3 — Per-horse record-keeping** | Training log, health records (incl. document upload), expenses + settlement, sale/ownership editing. | These are all tab content for the `HorseDetailPage` shell built in Phase 2 and share the owner/percentage-split UI. |
| **4 — Home & daily workflow** | Home dashboard, daily task board ("Hoy"), alerts, task templates. | Natural once task/alert data shapes exist from earlier phases. |
| **5 — Team & stable-wide management** | Team roster + permissions editor, team calendar/absences, member day view, stable-wide ("Cuadra") tasks/expenses. | Shares the admin/permissions-editor surface and the "stable-wide, not per-horse" data shape. |
| **6 — Boards (drag-and-drop)** | Weekly board + walker/paddock resource boards + board config. | Highest UI complexity (drag-and-drop, grid layout, conflict detection); benefits most from a proven, stable mutation API to build on. |
| **7 — Smart Order parser** | Extract pure parser functions (`splitClauses`, `matchHorses`, `extractFields`, `buildDraft`) first — no DOM coupling, first real unit-test opportunity in the codebase — then a thin React UI layer over them. | Most self-contained feature; benefits most from all three target mutation APIs already existing from earlier phases. |
| **8 — Stats, reports, final cutover** | Stats dashboard; training/team reports + PDF export (explicitly flag the Anthropic-direct-call issue from `BACKLOG.md` #2 rather than silently porting it as-is). Delete `public/legacy-app.js` and its `<script>` tag in `index.html`; remove the `window._FB` global bridge. | The actual cutover moment — only after all 21 features are confirmed working in React. |

## 5. Component boundary examples

### A. Horse Detail view (`rHorse`, `public/legacy-app.js` ~line 1657)

```
HorseDetailPage.jsx            (route: /horses/:hid)
  ├── HorseHeader.jsx           (photo, owners+splits, breed, pedigree, edit/report buttons)
  ├── HorseTabs.jsx             (generic Tabs; active tab driven by ?tab= search param —
  │                              bookmarkable, unlike legacy V.tab)
  └── active tab only mounts:
      ├── TrainingTab.jsx → TrainingCard.jsx
      ├── HealthTab.jsx → HealthDocCard.jsx
      ├── ExpensesTab.jsx
      └── SaleTab.jsx (reuses OwnerSplitEditor)
```
The legacy `rHorse()` computes stats, header markup, tab nav, AND all 4 tabs' full markup in
one 300+ line function regardless of which tab is active, with permission checks inlined at
every interpolation. Splitting into mounted-tab-only components means, e.g., `HealthTab`
(upload forms, doc grid, due-date badges) never evaluates unless selected, and each tab is
understandable/testable in isolation.

### B. Weekly / Resource Boards (drag-and-drop)

```
BoardsPage.jsx                  (route: /boards, sub-tab via ?tab=weekly|walker|paddock|config)
  ├── weekly/WeeklyBoardGrid.jsx → QuickAssignPanel.jsx, WeekNavigator.jsx, PlanCell.jsx,
  │                                 PeriodicColumnCell.jsx
  ├── resource/ResourceBoardPage.jsx → DateNavigator.jsx, PendingHorseList.jsx, ResourceSlot.jsx
  └── config/BoardConfigPage.jsx

useBoardDnd.js   (wraps StableDataContext's board mutators + the horseConflict pure check,
                  so drag components stay presentational and never touch Firestore directly)
```
Legacy `rWeeklyBoard`/`rResourceBoard` mix grid-markup generation, drag-state held in
module-level globals, conflict math, and mutation calls in one function each. Extracting
drag/conflict logic into `useBoardDnd` makes `ResourceSlot`/`PlanCell` pure presentational
components driven by props + one shared hook.

### C. Smart Order parser

```
SmartOrderPage.jsx → buildDraft(text, baseDate, {horses, team, permissions})
                       from parser/buildDraft.js — a PURE function composed of
                       splitClauses.js, matchHorses.js, extractFields.js
  → SmartOrderReview.jsx → SmartOrderDraftItem.jsx (editable horse/person selects,
                            checkbox enabled only if `allowed`)
  → "Confirmar y crear" calls useStableData()'s addTask/addHealthRecord/addExpense mutators
```
The legacy `so*` helpers are already mostly string/data functions — this is the clearest case
for extracting genuinely unit-testable logic away from rendering. `parser/` becomes the first
part of the codebase with real test coverage (feed a sample string in, assert draft shape
out) with no DOM or React Testing Library needed. The React layer becomes a thin, swappable
presentation layer over that logic.

## Critical files

- `public/legacy-app.js` — source of truth for every feature's current behavior; every phase
  reads from this file section by section (see `FEATURES.md` for the line-range map).
- `src/firebase.js` — current Firebase init + `window._FB` bridge; basis for `lib/firestore.js`;
  needs the API key moved to env vars (Phase 0).
- `src/styles.css` — existing design system, reused as-is under React `className`s.
- `index.html` — currently loads both `legacy-app.js` and `src/main.js`; the Phase 8 cutover
  point where the legacy `<script>` tag is finally removed.
- `package.json` — target for `react`/`react-dom`/`react-router-dom` additions.
