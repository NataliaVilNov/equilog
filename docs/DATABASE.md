# EquiLog — Database Documentation

EquiLog uses **Firebase** as its entire backend: Firebase Auth for authentication, Cloud
Firestore for data storage, and Firebase Storage for file uploads. There is no SQL database,
no ORM, and no migrations folder — this document describes the Firestore/NoSQL data model as
it exists today, plus the app's read/write patterns.

This reflects the current React implementation (`src/contexts/`, `src/lib/`) — the
pre-migration vanilla-JS app (`public/legacy-app.js`, `src/firebase.js`) was deleted in the
Phase 8c cutover, and the single-document-per-stable model that app used was itself replaced
by the subcollection layout described below. See `docs/BACKLOG.md` #3 and this file's git
history if you need that earlier design's rationale.

Connection setup lives in `src/lib/firebaseClient.js` — a standalone Firebase app instance
initialized from `VITE_FIREBASE_*` env vars (`.env.example`), exporting `auth`/`db`/`storage`
directly as module exports.

## 1. Firestore collections

### `users/{uid}`
One document per authenticated user, keyed by their Firebase Auth uid. Written by
`register()`/`updateUserProfile()` (`src/features/auth/authActions.js`): `name`, `email`,
`phone`, `bio`, `photo` (a small client-resized data URL — see §3), `role`, `created`/
`updated` timestamps. `lastStable` (the stable id to auto-load on next login) is written
separately by `StableSelectionContext`'s `switchStable`/`exitActiveStable`. Loaded once per
auth-state change by `AuthContext`'s `loadProfile()`.

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
teamMemberName?, createdBy?, created}`.

### Everything else lives under `stables/{stableId}/...`
Every operational record for a stable is its own document in its own subcollection, sized to
how it's actually queried:

| Collection | Purpose |
|---|---|
| `horses/{horseId}` | one document per horse |
| `horses/{horseId}/trainings/{trainingId}` | one document per training session |
| `horses/{horseId}/health/{healthId}` | one document per health record |
| `horses/{horseId}/healthDocs/{docId}` | one document per uploaded/linked health document |
| `horses/{horseId}/expenses/{expenseId}` | one document per horse-specific expense |
| `team/{memberId}` | one document per team-roster member |
| `tasks/{taskId}` | unified tasks — horse-specific or general chore, one-off or recurring, see §2 |
| `tasks/{taskId}/occurrences/{date}` | sparse per-date exceptions for recurring tasks, see §2 |
| `stableExpenses/{expenseId}` | stable-wide expenses |
| `sessionAlerts/{alertId}` | pending training-report alerts |
| `taskTemplates/{templateId}` | reusable task bundles, stamped on demand — orthogonal to recurrence, see §2 |
| `absences/{absenceId}` | team member absence-calendar entries |
| `expenseSettlements/{settlementId}` | recorded owner-to-owner settlement transfers |
| `weeklyPlans/{planId}` | Boards weekly grid rows, one per horse+day (deterministic id: `${hid}__${date}`) |
| `periodicBoardDates/{recordId}` | Boards due-date tracker rows, one per horse+column (deterministic id: `${hid}__${columnId}`) |
| `boardAssignments/{assignmentId}` | Boards walker/paddock resource-slot bookings |
| `boardConfig/main` | Boards settings — a **single document**, not a subcollection (see §5) |

Boards data (`weeklyPlans`, `periodicBoardDates`, `boardAssignments`) is scoped to the
*stable*, not nested under each horse, because board views are inherently "every horse for
this day/week" queries — nesting under `horses` would make that the awkward
cross-subcollection query instead of the easy one.

### Horse subcollection fields

| Collection | Holds |
|---|---|
| `horses/{horseId}` | name, breed, dob, `owners[]` (name + % split), pedigree, sale info, `sortOrder`, `photo: {path, url}` |
| `trainings/{trainingId}` | date, duration, work type, rating, notes |
| `health/{healthId}` | type, date, next-due date (`nxt`), amount, payee, payment status |
| `healthDocs/{docId}` | title, category, date, notes, Storage `path` + `url`, optional `healthId` link |
| `expenses/{expenseId}` | concept, amount, date, category, payer/payee, status, optional `healthId` link, settlement fields |

Every document in `trainings`, `health`, `healthDocs`, and `expenses` also carries a
`stableId` field, even though it's already implied by the document's path — that's what lets
`collectionGroup()` queries filter to one stable without walking each doc's ancestor path (see
§4).

## 2. Unified tasks

`tasks/{taskId}` replaced the old split between per-horse tasks and stable-wide "cuadra"
chores: a task is horse-specific or a general chore, assigned or unassigned, one-off or
recurring — independently, via nullable fields rather than which collection it lived in.

| Field | Type | Notes |
|---|---|---|
| `id`, `stableId` | string | |
| `horseId` | string, nullable | `null` = a general stable chore, not tied to a horse |
| `assignedTo` | string, nullable | `null` = shows on every team member's to-do list, computed at read time (`assignedTo == null OR assignedTo == me`) — never fanned out as a write per member |
| `activity` | string | an `AK` activity id when horse-linked, or free text for a general chore (`activityById()` falls back to a generic icon for unrecognized strings) |
| `startDate` | date | the due date for a one-off task; the series' anchor date for a recurring one |
| `time`, `dur`, `notes`, `status` | — | unchanged from the pre-unification shape; `status` is only meaningful for a **non-recurring** task (see below) |
| `recurrenceRule` | map, nullable | embedded on the task itself, not its own collection — see below |
| `createdBy` | string, nullable | |

**`recurrenceRule`** has to be a small vocabulary the client can expand itself, since Firestore
has no server-side RRULE query — there's no query that returns "every Thursday between date A
and B." `src/lib/recurrence.js` (`expandOccurrences`, `matchesRule`) does that expansion for
whatever date a screen is rendering:

| Field | Type | Example |
|---|---|---|
| `freq` | string | `"daily"`, `"weekly"`, `"monthly"` |
| `interval` | number | every *N* `freq` — e.g. `2` + `"weekly"` = every 2 weeks |
| `byWeekday` | array, nullable | `["TH"]` → "every Thursday" |
| `bySetPos` | number, nullable | `1` + `byWeekday: ["SU"]` → "the 1st Sunday of the month" |
| `byMonthDay` | number, nullable | `20` → "the 20th of every month" |
| `until` | date, nullable | series end date |
| `count` | number, nullable | series ends after *N* occurrences |

**`tasks/{taskId}/occurrences/{date}`** holds only exceptions — it's sparse by design. If no
occurrence document exists for a date, that occurrence is implicitly pending with the series'
default `assignedTo`. A document (`{taskId, stableId, date, status}`) is written only when a
specific date's status diverges from pending — `cycleOccurrenceStatus` in
`StableDataContext.jsx` is the only thing that writes one today. The schema also allows an
`overrideAssignedTo` field for handing a single occurrence to someone else without touching
the series (mirroring how Google Calendar handles editing one instance of a recurring event),
but no UI currently writes it — reassigning a single occurrence isn't built yet, only marking
one done/pending is.

`useTaskOccurrences(stableId, tasks, date)` (`src/hooks/`) is the read-side counterpart: for
one visible date, it returns one task-shaped view model per task occurring that day, with a
recurring task's `status`/`assignedTo` substituted from that date's occurrence doc (or
defaults). It's currently wired into every screen that shows "tasks for today" (`DayBoardPage`,
`MemberDayPage`, `HomePage`) but not into any multi-day view — `StatsPage`'s date-range task
stats still read the raw `tasks` collection, so a recurring task's individual occurrences don't
roll up into historical stats correctly yet.

`taskTemplates` is unaffected by any of this and stays a separate concept: a template is a
bundle of one-off tasks a user stamps onto a chosen date (`applyTemplate`); a `recurrenceRule`
is a single task that repeats on its own schedule. They don't compete with each other.

## 3. Firebase Storage usage

Every file attachment in the app — health-record documents (`healthDocs`), horse photos, and
team-member photos — is uploaded to Storage, with only a `{path, url}` pair stored on the
owning Firestore document, never file content inline:
- Health docs: `stables/{stableId}/horses/{hid}/health_docs/{timestamp}_{id}_{safeName}`.
- Horse photos: `stables/{stableId}/horses/{hid}/photo/{timestamp}_{safeName}`.
- Team-member photos: `stables/{stableId}/team/{mid}/photo/{timestamp}_{safeName}`.

All three go through the same `uploadFileWithProgress` helper in `StableDataContext.jsx`
(`uploadHealthDocs`, `uploadHorsePhoto`, `uploadTeamMemberPhoto`). For a brand-new horse or
team member, its id is generated client-side (`uid()`) before the photo is even picked, so the
upload has a final Storage path to target immediately rather than waiting for the record's
first save.

**Profile photos** (`users/{uid}.photo`) are the one exception to "everything goes to
Storage" — they're resized/recompressed client-side (`src/lib/imageResize.js`) into a small
data URL and written inline, since a single small per-user field never approaches Firestore's
document-size ceiling the way a per-stable collection of horse/team photos could.

## 4. Read path

Each collection above gets its own listener in `StableDataContext.jsx`, keyed on the active
`stableId`, aggregated into one context value so most components read the same flat
`{id, ...fields}` array shape they always have — only the collections whose *fields* changed
during the migration (`tasks`, and the `cexpenses`→`stableExpenses` rename) required call-site
updates; everything else was a pure data-layer change.

- **Direct collection listeners** (`subscribeToCollection`, `src/lib/firestoreCollections.js`)
  for `horses`, `team`, `tasks`, `sessionAlerts`, `taskTemplates`, `stableExpenses`,
  `absences`, `expenseSettlements`, `weeklyPlans`, `periodicBoardDates`, and
  `boardAssignments` — each already scoped to the stable by its path.
- **`collectionGroup` listeners** (`subscribeToCollectionGroup`) for `trainings`, `health`,
  `healthDocs`, and `expenses` — the four collections nested under each horse. This keeps the
  listener count constant regardless of how many horses a stable has, instead of opening one
  listener per horse; it's what the `stableId` field on every one of those docs is for (a
  `collectionGroup` query can't filter by ancestor path, only by a field).
- **One document listener** (`subscribeToDoc`) for `boardConfig/main`.
- **`tasks/{id}/occurrences` is deliberately never subscribed globally** — it's queried
  per-visible-date instead (`useTaskOccurrences`, §2), since a sparse exceptions collection
  could still grow large across many recurring tasks over years.

A stable with every feature in use ends up with around 16 active listeners — the "handful of
subcollections with a few collection-level listeners" middle ground, not one listener per
document and not the single listener the old model used.

The first time a new `collectionGroup` or compound query runs against a given Firestore
project, the console throws a one-time "this query requires an index" error with a link to
create it — a manual step in Firebase console, not something this codebase configures.

## 5. Write path

`src/lib/firestoreCollections.js` provides the shared per-document primitives every mutator in
`StableDataContext.jsx` is built on: `writeDoc` (full-document `setDoc`), `patchDoc`
(field-level `updateDoc`), `deleteDocRef`, and `batchDeleteQuery` (chunked `writeBatch`
deletes, ≤500 per batch, for cascades like deleting a horse's subcollections). Every write
also runs through `cleanForFirestore()` (`src/lib/cleanForFirestore.js`), which recursively
replaces `undefined` with `null` since Firestore rejects `undefined`.

Several mutators need more than one document to change atomically and use `writeBatch()`
directly for that: adding a health record with a cost (writes the health doc + its linked
expense together), settling expenses (writes the settlement doc + patches every settled
expense), applying a template or confirming a Smart Order draft (writes N new task/health/
expense docs in one batch), and weekly-board copy/repeat actions (writes every target cell in
one batch).

There is **no debouncing** on any of these writes. The earlier single-document model debounced
(`useDebouncedSave`, now deleted) because every keystroke or toggle re-sent the *entire*
stable's data; once each mutator targets only the one small document it actually changed,
almost every write site is now form-submit-based and there's no equivalent cost to coalesce —
one save button press is already just one small write. A keyed-debounce utility
(`src/lib/keyedDebounce.js`) was built early in this migration in case some mutator still
needed to coalesce rapid writes to the same document; in practice none did, so it was deleted
as dead code once the migration was complete.

**One known exception**: `SaleTab` (`docs/components/horses.md`) writes on every field change,
not on submit — `updateHorseSale` now fires an immediate Firestore write per keystroke where
it previously debounced at 250ms as part of the old shared blob write path. This is a real,
if minor, write-volume regression from before the migration, not a deliberate design choice;
it's tracked in `docs/BACKLOG.md` rather than fixed here, since restoring per-field debouncing
is a small, separable follow-up.

Optimistic UI still works the same as before: the Firestore SDK applies a local write to its
cache and fires the relevant `onSnapshot` callback immediately, before the server round-trip
completes, so listeners don't need to filter on `snap.metadata.hasPendingWrites` the way the
old single-listener model did (that gating existed specifically because the old code kept its
own duplicate local copy of the whole document and needed to avoid re-applying its own pending
write).

## 6. What this replaced

Until this migration, every operational record for a stable — horses, tasks, health records,
boards, everything except `users`/`stables`/`inviteCodes` — lived as arrays inside one
`stables/{stableId}/data/main` document, read and written as a whole on every change. That
model hit a real 1 MiB per-document ceiling, had no field-level conflict resolution (two people
editing different things raced to overwrite each other's entire document), and had no way to
scope Firestore security rules or queries below "the whole stable." None of those problems were
forced by how Firestore works — see this file's git history (the migration branch's earlier
commits) for the fuller argument, still useful context for anyone evaluating a future schema
change the same way. `docs/BACKLOG.md` #3 tracks this migration as complete.
