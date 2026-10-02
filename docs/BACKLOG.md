# EquiLog — Backlog / Known Problems

Concrete, actionable problems found while documenting the codebase (see `FEATURES.md` and
`DATABASE.md`), ordered roughly by severity/urgency. Line numbers refer to the repo state on
branch `refactor/react-migration` at the time this doc was written; most now refer to
`public/legacy-app.js` as it existed **before** the Phase 8c cutover, which removed that file
— see `REFACTOR_PLAN.md` for the migration this backlog was originally written alongside.
Status lines below track what the React migration did and didn't resolve.

## Security

### 1. Firebase API key committed to the repo, no `.gitignore`, no `.env` anywhere
`src/firebase.js:11` hardcodes the Firebase Web `apiKey` directly in source, and the repo has
**no `.gitignore` file at all** — nothing is excluded from git. The key is already in git
history on the public/shared remote.
- **Fix**: add a `.gitignore` (node_modules, dist, `.env*`), move the Firebase config into
  Vite env vars (`VITE_FIREBASE_API_KEY`, etc., read via `import.meta.env.VITE_*`), and
  **rotate the key** in the Firebase console since it's already exposed in history. Note:
  Firebase Web API keys are not secret by design (they're safe to ship in a client bundle
  when Firestore Security Rules + App Check are properly configured) — the real ask here is
  hygiene (get it out of git going forward) plus verifying Firestore Security Rules actually
  restrict access, since there's no rules file visible in this repo to confirm that.
- **Status**: `.gitignore` added and the Firebase config now reads `import.meta.env.VITE_*`
  (`.env.example` documents the required vars) as of the Phase 0 housekeeping commits on
  `refactor/react-migration` — first in `src/firebase.js`, and since the Phase 8c cutover in
  its replacement `src/lib/firebaseClient.js` (the legacy bridge file was deleted along with
  `public/legacy-app.js`). The key is still present in git history on `main`, so **rotating
  it in the Firebase console remains outstanding** — that's a manual step outside this repo.

### 2. AI report features call the Anthropic API directly from the browser
`genRep()` (training reports) and `genTR()` (team reports) do a client-side
`fetch("https://api.anthropic.com/v1/messages", ...)` with **no API key or auth header
visible in the code**. Two possibilities, both bad:
- The feature is already broken in production (the call 401s), meaning a paid feature is
  silently non-functional and no one may have noticed.
- Or a key was stripped before this commit but the intent was to embed one — which would be a
  **client-exposed secret vulnerability**, letting anyone inspect the bundle and drain the
  API key's quota/budget.
- **Fix**: never call a paid LLM API directly from client code with an embedded key. Stand up
  a minimal server-side proxy (Cloud Function, or any small backend) that holds the key and
  the client calls that instead. Until that exists, this feature should be explicitly
  descoped/disabled rather than left in an ambiguous broken/vulnerable state.
- **Status**: not fixed — deliberately. Both call sites (`src/features/reports/
  TrainingReportPage.jsx`, `src/features/team/TeamReportPage.jsx`) were ported byte-for-byte
  during the React migration, including this behavior, rather than silently patched or cut.
  See `docs/components/reports.md` for the reasoning. Still the top actionable item in this
  backlog now that the component migration itself is done.

## Data model

### 2b. Notion export keeps the integration token in the browser
The Notion export (`docs/components/notion.md`) calls `api.notion.com` straight from the
browser with the user's own integration token, stored only in that device's `localStorage`.
Two caveats: Notion's browser (CORS) access is observed, not documented, and the token is
readable by anything running in that browser profile. The safer design is the same serverless
proxy item #2 asks for (holds secrets, verifies the Firebase login) — `notionClient.js` takes a
`baseUrl` so it can be repointed without touching the rest. New Firestore rules
(`integrations`, `notionLinks`) must be published in the console.
- **Status**: accepted trade-off for now; revisit together with #2.

### 3. Single Firestore document per stable (scalability + concurrency risk)
The entire stable dataset (every horse, every training/health/expense record, tasks, team,
etc.) used to live in one Firestore document (`stables/{id}/data/main`), overwritten wholesale
on every save. Concretely, that meant:
- Any two team members editing different things at the same time could silently clobber each
  other's changes (whole-document last-write-wins, no field-level merge).
- The document would eventually hit Firestore's 1 MiB size limit, especially since horse
  photos were stored as inline base64 rather than in Firebase Storage.
- No server-side querying, pagination, or per-resource security rules were possible.
- **Fix**: migrate to per-collection subcollections (`stables/{id}/horses/{hid}`, `.../tasks/{id}`,
  etc.) with per-document listeners aggregated client-side, and move horse/team photos to
  Storage.
- **Status**: done. `refactor/firestore-schema-migration` replaced the single blob document
  with the subcollection layout documented in `docs/DATABASE.md` §1 — every horse, training,
  health record, expense, task, team member, and Boards record is now its own small Firestore
  document, aggregated client-side via per-collection listeners
  (`docs/DATABASE.md` §4). Horse and team-member photos moved to Firebase Storage alongside
  the existing health-doc uploads (`docs/DATABASE.md` §3). Tasks were also unified across this
  same migration — see item below and `docs/components/tasks.md`.
  - **Fine-grained Security Rules**: done, as a follow-up on the same branch. `firestore.rules`
    now checks the caller's own `stables/{id}/team/{memberId}.permissions` (or admin/owner
    status) per collection, instead of blanket stable-membership — see `docs/DATABASE.md` §4
    for the exact permission→collection mapping and the two known limitations (existing team
    docs need their ID backfilled to the linked user's auth uid to be recognized by the rules'
    lookup; non-admin self-editing of a teammate doc's own non-privileged fields is disabled
    for now, admin/owner required for all `team` doc writes).

### 3b. Unified tasks + recurrence (feature added alongside the schema migration)
The previous split between per-horse `tasks` and stable-wide "cuadra" recurring `ctasks` was
collapsed into one `tasks` collection with nullable `horseId` (null = general chore) and
`assignedTo` (null = shows on everyone's day) fields, plus Google-Calendar-style recurrence
(`recurrenceRule`, daily/weekly/monthly with by-weekday/nth-weekday/day-of-month/until/count)
and a sparse per-date `occurrences` exceptions subcollection so a recurring task never needs
its future occurrences materialized in advance. See `docs/DATABASE.md` §2 and
`docs/components/tasks.md`.
- ~~**Known gap**: `useTaskOccurrences` ... only wired into single-date screens~~ — **fixed**:
  `useTaskOccurrences(stableId, tasks, rangeStart, rangeEnd)` now accepts a date range
  (`rangeEnd` defaults to `rangeStart`, so the three single-date call sites — `DayBoardPage`,
  `MemberDayPage`, `HomePage` — needed no changes) and returns one row per matching
  occurrence date, not one per task. `StatsPage`'s "Equipo" tab and `TeamReportPage` both now
  read through it instead of the raw `tasks` collection, so recurring-task completions roll up
  correctly per occurrence. `StatsPage` falls back to a fixed 2-years-back-to-today window for
  this tab specifically when no date filter is set, since the range query needs concrete
  bounds (the Financial/Horses tabs are unaffected, still literally unbounded).
- ~~**Known gap**: there's no UI to reassign ... a single occurrence~~ — **reassignment fixed**:
  tapping a recurring occurrence's assignee badge on `TaskCard` (gated on `can("tasks")`) opens
  an inline pill picker (reusing `TaskFormPage`'s `.pch`/`.pc` pattern) that writes
  `overrideAssignedTo` via the new `setOccurrenceAssignee` mutator. Fixed a related latent bug
  in the process: occurrence-doc writes (`cycleOccurrenceStatus` and the new mutator) now use
  `writeDocMerged` instead of a full `setDoc`, since the two are independent writers of the
  same sparse doc and would otherwise clobber each other's field. **Skip is still not built** —
  no such status exists in the app (`pending`/`inprogress`/`done` only); a separate item if
  wanted.

## Code organization

### 4. No React / component structure — 3,741-line monolith
`public/legacy-app.js` was a single file implementing all 21 features, hand-rolled routing, a
global mutable state object, and a 110-line function that manually rewired every form's event
handlers after each render. This was the primary subject of `REFACTOR_PLAN.md`.
- **Status**: done. All 21 features now live under `src/features/*` as React components with
  Context-based state management (`src/contexts/`), `react-router-dom` routing
  (`src/routes/`), and per-feature documentation (`docs/components/*.md`). The Phase 8c
  cutover repointed `index.html` at the React entry and deleted `public/legacy-app.js`,
  `react-app.html`, `src/main.js`, and `src/firebase.js` — the monolith no longer exists in
  this repo. See `REFACTOR_PLAN.md` for the full phase-by-phase record of how it was ported.

### 5. Dead duplicate file: `src/legacy-app.js`
`src/legacy-app.js` (221KB, ~3,443 lines) is ~85% identical to `public/legacy-app.js` but is
**not referenced anywhere** — `index.html` loads `./legacy-app.js`, which Vite resolves to
`public/legacy-app.js`. The `src/` copy is missing newer features (Home dashboard, the entire
Boards feature) and appears to be a stale snapshot left behind after edits continued only in
`public/`.
- **Fix**: delete `src/legacy-app.js` once confirmed unreferenced (Phase 0 of
  `REFACTOR_PLAN.md`). Trivial, zero-risk cleanup — do this regardless of whether/when the
  full React migration proceeds.
- **Status**: done — removed on `refactor/react-migration` during Phase 0.

### 6. Horsetelex pedigree import is CORS-fragile (resolved: no fetch at all)
`fetchHorsetelexHtml()` does a direct client-side `fetch()` against an external
horsetelex.com URL with no server-side proxy. This will break unpredictably if
horsetelex.com's CORS policy changes, and there's already a manual-paste fallback in the UI
suggesting this is a known pain point.
- **Fix**: either accept manual-paste as the primary path and simplify the UI, or add a small
  server-side proxy endpoint for the fetch.
- **Status**: done on `feature/horsetelex-import`. The port actually went through three public
  CORS proxies, and neither that nor a server-side proxy can work: horsetelex.com sits behind a
  Cloudflare bot challenge (every automated request gets a 403) and sends no CORS headers, and
  getting around that is off the table. The import therefore never contacts Horsetelex: the
  user pastes the page source they already have open (or uses the clipboard bookmarklet) and
  `horsetelexParser.js` reads the JSON Angular embeds in it. A real URL-in/data-out flow would
  need an official data licence/API from Horsetelex (now part of Equine & Stable Technologies
  GmbH).


## Testing & process

### 7. No automated tests anywhere in the repo
There is no test runner configured, no test files, and no CI step beyond the GitHub Pages
deploy workflow (`.github/workflows/deploy.yml`, which just runs `npm run build` and deploys
`/dist`). Every feature is currently validated by hand.
- **Fix**: not urgent to fix on the legacy codebase, but the React migration is a natural
  point to start — e.g. `REFACTOR_PLAN.md` Phase 7 (Smart Order) explicitly calls out
  extracting the `so*` parser functions as pure functions specifically because they're the
  first realistic unit-test target in the app.
- **Status**: a test runner (`vitest`, `npm test`) now exists, used so far only by
  `src/features/horses/horsetelexParser.test.js`. The migration did, however, consistently pull
  business logic out into small pure functions with no DOM/global reads (`src/lib/*.js`,
  and every feature's non-component helper files, e.g. `expenseSplits.js`,
  `saleLiquidation.js`, the whole `src/features/smart-order/` parsing pipeline) — these are
  now realistic unit-test targets.

## Documentation

### 8. README only documents the most recently added feature
`README.md` documents exclusively the "Boards" (pizarras) feature — the app's other 20
features have no top-level documentation, no setup/install instructions (`npm install`,
`npm run dev`), no architecture overview, and it's Spanish-only with no translation.
- **Fix**: `FEATURES.md` and `DATABASE.md` in this same `docs/` folder now cover this gap;
  consider trimming `README.md` down to a short pointer (setup steps + links into `docs/`)
  rather than a feature-specific document.
- **Status**: `docs/` now also has `REFACTOR_PLAN.md` and a `docs/components/*.md` file per
  feature (21 of them). `README.md` itself hasn't been touched — still worth trimming down to
  a pointer, per the fix above.

## Minor / non-blocking

- **No error boundaries**: legacy's only error handling around rendering was one top-level
  `try/catch` inside `render()` that replaced the entire app body with a generic error
  message on any render exception. The React app doesn't have an equivalent yet either — no
  `ErrorBoundary` component exists anywhere under `src/` — so an uncaught render error still
  takes down the whole UI with no recovery path short of reloading. **Still open.**
- ~~Heavy inline `style="..."` attributes throughout `index.html` for static shell markup~~
  — **resolved by the Phase 8c cutover**: `index.html` is now just the React mount point
  (`<div id="root">` + a `<script type="module">` tag); all the shell markup this item
  referred to (auth screen, modals, panels) is React components now, most already using
  `src/styles.css`'s class-based design system rather than inline styles.
- **No CI beyond deploy**: still true — no lint step, no build-failure gate other than the
  deploy workflow itself failing.
- ~~**`SaleTab` writes one Firestore document per keystroke**~~ — **fixed**: `SaleTab.jsx`'s
  three hot-path handlers (price, owner name, owner %) now call `updateHorseSale` through
  `useDebouncedCallback` (`src/lib/useDebouncedCallback.js`, 250ms, matching the old shared
  debounce's delay), scoped to just this screen rather than reintroducing the deleted
  general-purpose `keyedDebounce.js`. `handleAddOwner`/`handleRemoveOwner` still write
  immediately (button clicks, not hot paths). Confirmed live-testing was necessary here, not
  optional: the naive debounce-only version stuttered badly — the price/owner inputs are fully
  controlled by live Firestore-backed context state, and that context re-renders on almost any
  of its ~15 listeners firing, snapping the input back to its pre-keystroke value mid-edit. Now
  fixed with a small local `draftSale` state that's authoritative while editing (cleared when
  the viewed horse changes), so the debounce only throttles writes, not what's on screen.
