# EquiLog — Database Documentation

EquiLog uses **Firebase** as its entire backend: Firebase Auth for authentication, Cloud
Firestore for data storage, and Firebase Storage for file uploads. There is no SQL database,
no ORM, and no migrations folder — this document describes the Firestore/NoSQL data model as
it exists today, plus the app's read/write patterns.

This reflects the current React implementation (`src/contexts/`, `src/lib/`) — the
pre-migration vanilla-JS app (`public/legacy-app.js`, `src/firebase.js`, the
`window._FB`/`window._fbLoadUserProfile` bridge this doc originally described) was deleted in
the Phase 8c cutover. See `docs/REFACTOR_PLAN.md` for that history if you need it.

Connection setup lives in `src/lib/firebaseClient.js` — a standalone Firebase app instance
initialized from `VITE_FIREBASE_*` env vars (`.env.example`), exporting `auth`/`db`/`storage`
directly as module exports (no global `window` bridge; nothing else needs one now that the
legacy script is gone).

## 1. Firestore collections

### `users/{uid}`
One document per authenticated user, keyed by their Firebase Auth uid. Written by
`register()`/`updateUserProfile()` (`src/features/auth/authActions.js`): `name`, `email`,
`phone`, `bio`, `photo` (a small client-resized data URL — see §4), `role`, `created`/
`updated` timestamps. `lastStable` (the stable id to auto-load on next login) is written
separately by `StableSelectionContext`'s `switchStable`/`exitActiveStable`. Loaded once per
auth-state change by `AuthContext`'s `loadProfile()`, which falls back to
`{name, email, stables: []}` if the doc doesn't exist yet (e.g. mid-registration).

### `stables/{stableId}`
One document per stable ("cuadra"). Metadata only, written by `StableSelectionContext`
(`createStable`/`joinByCode`/`leaveStable`/etc.): `name`, `description`, `ownerId`,
`memberIds: string[]`, `members` (a map keyed by uid → `{name, email, role, joined}`),
`inviteCode`, `created`. This is what the `/stables` list page queries
(`where("memberIds", "array-contains", uid)`) and what `joinByCode()` updates when someone
joins.

### `inviteCodes/{code}`
Top-level, short random-code-keyed docs, written by `createStable` (a general stable invite)
and `createMemberInvite` (a per-team-member invite): `{stableId, name, teamMemberId?,
teamMemberName?, createdBy?, created}`. `joinByCode()` reads one of these to resolve which
stable — and optionally which team-member profile to link — an entered code points to.

### `stables/{stableId}/data/main`
**The entire operational dataset for a stable lives in this single document.** Everything a
user does inside a stable — horses, training logs, health records, expenses, tasks, team
roster, absences, board plans — is stored as arrays inside this one JSON blob, read/written
as a whole by `StableDataContext` (`src/contexts/StableDataContext.jsx`).

The shape is defined by `emptyData()`/`withDefaults()` in that file — one array per key in
`COLLECTION_KEYS`, plus one object field (`boardConfig`):

| Field | Shape | Holds |
|---|---|---|
| `horses` | array | id, name, breed, dob, `owners[]` (name + % split), pedigree (sire/dam/grandparents), `photo` (inline base64), sale info, `sortOrder` |
| `trainings` | array | training sessions, keyed by horse id: date, duration, work type, rating, notes |
| `health` | array | health records, keyed by horse id: type, date, next-due date (`nxt`), amount, payee, payment status |
| `healthDocs` | array | uploaded document/photo references (Firebase Storage path + URL — see §4), linked to a health record |
| `expenses` | array | per-horse expenses, with owner-split settlement fields |
| `team` | array | team members: name, linked auth uid (if linked), per-member permissions object |
| `tasks` | array | per-horse daily tasks, assignable to a team member |
| `ctasks` | array | stable-wide ("cuadra") recurring tasks, not tied to a horse |
| `cexpenses` | array | stable-wide expenses |
| `salerts` | array | pending "session alerts" needing a training-report response |
| `templates` | array | reusable task templates |
| `absences` | array | team member absence-calendar entries |
| `expenseSettlements` | array | recorded owner-to-owner settlement transfers |
| `weeklyPlans` | array | the Boards weekly grid: one row per horse+day — `activities[]`, `completed[]`, `note`, `vetHealthId` (links to a `health` record) |
| `periodicBoardDates` | array | Boards' due-date tracker columns (herraje/desparasitación/etc.), one row per horse+column |
| `boardAssignments` | array | Boards' walker/paddock resource-slot bookings |
| `boardConfig` | object | the only non-array field: `{activities[], periodicColumns[], walkers[], paddocks[], paddockSlots[]}` — configurable Boards settings |

Full field-level detail for any of these lives in that feature's own
`docs/components/*.md` — this table is the map, not the territory.

### No other Firestore collections
There is no separate collection per entity type (no top-level `horses` collection, no
`trainings` collection, etc.) — everything except `users`, `stables` metadata, and
`inviteCodes` is nested inside the one `data/main` document per stable.

## 2. Read path

`StableDataContext`'s effect (keyed on the active `stableId`) does two things on every
stable switch:

1. **`getStableDoc(stableId)`** (`src/lib/firestore.js`) — a one-time `getDoc()`, so first
   paint doesn't wait on the realtime listener.
2. **`subscribeToStableDoc(stableId, onChange)`** — an `onSnapshot()` listener on the same
   document. It only calls `onChange` when `snap.metadata.hasPendingWrites === false` —
   this is what stops the app from redundantly re-rendering off its own optimistic local
   write before the round-trip to the server completes, and is how multiple team members
   editing the same stable see each other's changes live.

Both paths run their result through `withDefaults()`, which back-fills any collection or
field an older stable's stored document predates (e.g. `weeklyPlans[].note` defaulting to
`""` for rows written before that field existed, or the `vet` board activity getting
appended to a stable's `boardConfig.activities` if it's missing). This is how schema changes
roll out without a migration step — new fields just get a sensible default the first time
an old document is read.

## 3. Write path

Every feature-specific mutator (`addHorse`, `cycleTaskStatus`, `toggleWeeklyPlanCompleted`,
etc.) is built on one shared primitive in `StableDataContext`: `updateData(updater)`.

1. Applies `updater` to local React state immediately (`setData`) — this is why the UI
   feels instant/optimistic; nothing waits on the network round-trip.
2. Feeds the new full data object into `useDebouncedSave` (`src/hooks/useDebouncedSave.js`)
   — a 250ms debounce, so rapid successive edits (typing in a form, a run of board-toolbar
   taps) collapse into a single write instead of one per change.
3. That calls `cleanForFirestore()` (`src/lib/cleanForFirestore.js` — recursively replaces
   `undefined` with `null`, since Firestore rejects `undefined` in writes) and then
   `setStableDoc()` — a plain `setDoc()`. **This is a full-document overwrite on every
   save** — there is no partial/field-level update. Toggling one task's status rewrites the
   entire stable dataset, because the whole thing is one JS object saved as one document.
4. If the write fails (offline, permissions, etc.), it falls back to writing the same JSON
   shape into `localStorage` under a fixed key (`equilog_v4`) — write-only, never read back;
   a safety net against losing the in-progress edit, not an offline cache.

## 4. Firebase Storage usage

Only health-record document/photo attachments (`healthDocs`) go to actual Storage, via
`uploadHealthDocs()`/`deleteHealthDoc()` in `StableDataContext.jsx`. Files land at
`stables/{stableId}/horses/{hid}/health_docs/{timestamp}_{id}_{safeName}`; only the
resulting path + download URL are stored in the Firestore document, not the file content.

Everything else is inline in Firestore, not Storage:
- **Horse and team-member photos** are stored as base64 data URLs directly inside the
  `horses`/`team` arrays, with no client-side resizing — this contributes directly to
  document-size growth (see §5).
- **Profile photos** (`users/{uid}.photo`) are the one exception: resized/recompressed
  client-side (`src/lib/imageResize.js`) before being written, specifically to keep the
  small per-user profile document from ballooning.

## 5. Known limitations of this model

These are documented here as context, not fixed in this pass — see `docs/BACKLOG.md` for
prioritization:

- **Firestore's 1 MiB per-document limit** applies to the entire stable dataset. A stable
  with enough horses, history, and inline base64 photos will eventually hit this ceiling.
- **Whole-document last-write-wins**: if two team members edit different things
  simultaneously (e.g. one edits a horse's notes while another marks a task done), both
  writes race to overwrite the *entire* document — the loser's change is silently dropped,
  not merged. There is no field-level conflict resolution.
- **No per-collection queries or indexes**: because everything is one document, Firestore's
  querying/indexing features (server-side filtering/pagination) are unavailable — all
  filtering happens client-side in JS after loading the entire blob.
- **No per-collection Firestore Security Rules**: access control is enforced entirely in the
  client's `usePermissions().can()` logic, not by Firestore rules scoped to sub-resources,
  since there are no sub-resources to scope rules to.
- **Write amplification**: every single mutation, however small, re-serializes and re-sends
  the entire dataset.

The recommended long-term direction (tracked in `docs/BACKLOG.md` #3) is splitting this into
per-collection subcollections — e.g. `stables/{id}/horses/{hid}`,
`stables/{id}/horses/{hid}/trainings/{tid}`, `stables/{id}/tasks/{taskId}`, etc. — with
per-document `onSnapshot` listeners aggregated client-side, and moving horse/team photos into
Storage rather than inline base64. This is a materially larger, separate effort from any of
the feature work done so far and should not be bundled into it.

## 6. Firestore capabilities this design isn't using

None of the limitations in §5 are forced by Firestore itself — Firestore's actual feature set
argues for the opposite structure. This section exists so a future subcollection redesign
doesn't have to rediscover why. The single-blob shape is best understood as a straight port
of the pre-migration vanilla-JS app's single in-memory `D` object (see the legacy-app note at
the top of this doc) — persisting one JS object wholesale was the path of least resistance for
that app's architecture, not a decision driven by how Firestore works.

- **Field-level writes exist.** `updateDoc()` supports dot-path field updates,
  `arrayUnion()`/`arrayRemove()`, and `FieldValue.increment()`. None of these require reading
  or rewriting a whole document. The current `setDoc()` full-document overwrite on every save
  (§3) is a code choice, not a Firestore requirement — toggling one task's status doesn't need
  to re-serialize every horse and health record.
- **Multi-document atomicity exists via batched writes and transactions** (`writeBatch()`,
  `runTransaction()`), covering up to 500 documents per batch. If the motivation for one
  document per stable was "these related changes must land together," that guarantee is
  available across separate documents too — it doesn't require them to be one document.
- **Security rules are meant to be scoped per collection/document**, with rule expressions
  over `request.auth.uid`, `resource.data`, etc. A single document holding every sub-resource
  is exactly the case where per-resource rules become impossible, which is why this app pushes
  all access control into client-side `usePermissions().can()` logic instead (§5). That logic
  is a workaround for the schema's shape, not something Firestore requires — a subcollection
  layout (e.g. `stables/{id}/tasks/{taskId}`) would let rules restrict writes per-resource
  (e.g. only an assigned team member or admin can write a given task) directly at the database
  layer.
- **Querying, filtering, and pagination only work on top-level fields of documents inside a
  collection** — not on values nested inside an array field of one document. The "no
  per-collection queries or indexes" limitation in §5 isn't a Firestore ceiling; it's the
  direct consequence of storing `tasks`, `health`, etc. as arrays-in-a-blob instead of as
  documents in their own collections, which is what unlocks Firestore's query/index/paginate
  features in the first place.
- **The 1 MiB per-document limit (§5) is the one hard constraint here, and it cuts against the
  current design**, not in favor of it. Subcollections have no equivalent ceiling — each
  horse, training, or health record would be its own small document, so dataset growth scales
  without a per-stable cap.
- **The one real (if minor) argument for fewer documents**: many small `onSnapshot` listeners
  are somewhat fussier to wire up and aggregate client-side than one. This doesn't justify a
  single document, though — a handful of subcollections (`horses`, `tasks`, `health`, etc.)
  with a few collection-level `onSnapshot` queries is the idiomatic middle ground, and is what
  the redesign above already proposes.

## 7. Proposed schema redesign (not yet implemented)

This section is the concrete target for the §5/§6 migration — a subcollection layout sized to
how each piece of data actually grows and gets queried, rather than one document per stable.
Nothing below is implemented; it's the design to build toward under `docs/BACKLOG.md` #3.

### 7.1 Collection layout

| Path | Replaces | Purpose |
|---|---|---|
| `users/{uid}` | *(unchanged)* | see §1 |
| `stables/{stableId}` | *(unchanged)* | see §1 |
| `inviteCodes/{code}` | *(unchanged)* | see §1 |
| `stables/{stableId}/horses/{horseId}` | `horses[]` | one document per horse |
| `stables/{stableId}/horses/{horseId}/trainings/{trainingId}` | `trainings[]` | one document per training session |
| `stables/{stableId}/horses/{horseId}/health/{healthId}` | `health[]` | one document per health record |
| `stables/{stableId}/horses/{horseId}/healthDocs/{docId}` | `healthDocs[]` | one document per uploaded/linked health document |
| `stables/{stableId}/horses/{horseId}/expenses/{expenseId}` | `expenses[]` | one document per horse-specific expense |
| `stables/{stableId}/team/{memberId}` | `team[]` | one document per team-roster member |
| `stables/{stableId}/tasks/{taskId}` | `tasks[]` + `ctasks[]` | unified tasks — horse-specific or general chore, see §7.3 |
| `stables/{stableId}/tasks/{taskId}/occurrences/{date}` | *(new)* | sparse per-date exceptions for recurring tasks, see §7.3 |
| `stables/{stableId}/stableExpenses/{expenseId}` | `cexpenses[]` | stable-wide expenses |
| `stables/{stableId}/sessionAlerts/{alertId}` | `salerts[]` | pending training-report alerts |
| `stables/{stableId}/taskTemplates/{templateId}` | `templates[]` | reusable task bundles, stamped on demand — orthogonal to recurrence, see §7.3 |
| `stables/{stableId}/absences/{absenceId}` | `absences[]` | team member absence-calendar entries |
| `stables/{stableId}/expenseSettlements/{settlementId}` | `expenseSettlements[]` | recorded owner-to-owner settlement transfers |
| `stables/{stableId}/weeklyPlans/{planId}` | `weeklyPlans[]` | Boards weekly grid rows |
| `stables/{stableId}/periodicBoardDates/{recordId}` | `periodicBoardDates[]` | Boards due-date tracker rows |
| `stables/{stableId}/boardAssignments/{assignmentId}` | `boardAssignments[]` | Boards walker/paddock resource bookings |
| `stables/{stableId}/boardConfig/main` | `boardConfig` | Boards settings — stays a single small document; it's config, not per-record data, so it doesn't need splitting |

Boards data (`weeklyPlans`, `periodicBoardDates`, `boardAssignments`) stays scoped to the
*stable*, not nested under each horse — board views are inherently "every horse for this
day/week" queries, and nesting under `horses` would make that the awkward cross-subcollection
query instead of the easy one.

### 7.2 Horse subcollection fields

| Collection | Holds |
|---|---|
| `horses/{horseId}` | name, breed, dob, `owners[]` (name + % split), pedigree, sale info, `sortOrder` — photo moves to Storage, see §7.5 |
| `trainings/{trainingId}` | date, duration, work type, rating, notes |
| `health/{healthId}` | type, date, next-due date (`nxt`), amount, payee, payment status |
| `healthDocs/{docId}` | title, category, date, notes, Storage path + URL, optional `healthId` link |
| `expenses/{expenseId}` | concept, amount, date, category, payer/payee, status, optional `healthId` link, settlement fields |

### 7.3 Unified tasks

`tasks[]` (per-horse) and `ctasks[]` (stable-wide) collapse into one
`stables/{stableId}/tasks/{taskId}` collection. A task is horse-specific or a general chore,
assigned or unassigned, one-off or recurring — independently, via nullable fields rather than
which array it lived in:

| Field | Type | Notes |
|---|---|---|
| `stableId` | string (FK) | |
| `horseId` | string (FK), nullable | `null` = a general stable chore, not tied to a horse |
| `assignedTo` | string (FK), nullable | `null` = shows on every team member's to-do list |
| `activity` | string | |
| `startDate` | date | the due date for a one-off task; the series' anchor date for a recurring one |
| `recurrenceRule` | map, nullable | embedded, not a separate collection — see below |
| `createdBy` | string (FK) | |

`recurrenceRule` is embedded on the task document itself rather than its own collection,
because Firestore has no server-side RRULE engine — there's no query that returns "every
Thursday between date A and B." The rule instead has to be a small vocabulary the client can
expand for whatever range it's rendering (today's list, this week's board):

| Field | Type | Example |
|---|---|---|
| `freq` | string | `"daily"`, `"weekly"`, `"monthly"` |
| `interval` | number | every *N* `freq` — e.g. `2` + `"weekly"` = every 2 weeks |
| `byWeekday` | array, nullable | `["TH"]` → "every Thursday" |
| `bySetPos` | number, nullable | `1` + `byWeekday: ["SU"]` → "the 1st Sunday of the month" |
| `byMonthDay` | number, nullable | `20` → "the 20th of every month" |
| `until` | date, nullable | series end date |
| `count` | number, nullable | series ends after *N* occurrences |

`stables/{stableId}/tasks/{taskId}/occurrences/{date}` holds **only exceptions** — it's
sparse by design. If no occurrence document exists for a given date, that occurrence is
implicitly pending with the series' default `assignedTo`. A document is written only when a
specific date needs to diverge: marked `done`/`skipped`, or handed to someone else just that
once via `overrideAssignedTo`. This mirrors how Google Calendar itself handles editing a
single instance of a recurring event, and avoids ever having to materialize occurrences into
the far future.

Two consequences worth being explicit about:
- **"Everyone's to-do list" is computed at read time** (`assignedTo == null OR assignedTo ==
  me`), not fanned out as a write per member — an unassigned chore stays one document
  regardless of team size.
- **`taskTemplates` is unaffected by this and stays a separate concept**: a template is a
  bundle of one-off tasks a user stamps on demand (e.g. "morning routine" → 5 tasks for a
  chosen date); a `recurrenceRule` is a single task that repeats on its own schedule. They
  don't compete with each other.

### 7.4 Storage changes

Horse photos and team-member photos move out of Firestore entirely, uploaded the same way
`healthDocs` already are (§4) — only a Storage path + download URL stored on the `horses`/
`team` document, not a base64 data URL inline. This removes the other document-size-growth
path alongside the horses/health/expenses split above.

### 7.5 What doesn't change

`users/{uid}`, `stables/{stableId}`, and `inviteCodes/{code}` keep their current shape —
they're already right-sized documents, not arrays-in-a-blob. `boardConfig` stays a single
document under the stable for the same reason: it's small, admin-edited configuration, not
data that grows with usage. Not everything needs to be split — only the collections that
actually hit the problems in §5.
