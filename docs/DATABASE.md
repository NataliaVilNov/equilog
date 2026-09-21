# EquiLog — Database Documentation

EquiLog uses **Firebase** as its entire backend: Firebase Auth for authentication, Cloud
Firestore for data storage, and Firebase Storage for file uploads. There is no SQL database,
no ORM, and no migrations folder — this document describes the Firestore/NoSQL data model as
it exists today, plus the app's read/write patterns.

Connection setup lives in `src/firebase.js`. It initializes the Firebase app, exposes
`auth`/`db`/`storage` plus every Firestore/Storage function the app uses on `window._FB` (a
bridge so the non-module `public/legacy-app.js` can call them), and drives the app's boot
sequence via an `onAuthStateChanged` listener.

## 1. Firestore collections

### `users/{uid}`
One document per authenticated user. Holds profile data: display name, photo/avatar, and
`lastStable` (the stable id to auto-load on next login). Loaded via
`window._fbLoadUserProfile()`.

### `stables/{stableId}`
One document per stable ("cuadra"). Holds stable metadata: name, description, invite code,
and team references. This is what `renderStableList()` reads to show a user's stables and
what `joinByCode()` looks up when a user enters an invite code.

### `stables/{stableId}/data/main`
**The entire operational dataset for a stable lives in this single document.** Everything a
user does inside a stable — horses, training logs, health records, expenses, tasks, team
roster, absences, board assignments — is stored as arrays inside this one JSON blob.

The shape is defined by `load()` (`public/legacy-app.js` ~line 986):

```js
function load(){
  return {
    horses:[],       // per-horse records: id, name, breed, dob, owners[] (with % splits),
                      // pedigree (sire/dam/gsire/gdam/mgsire/mgdam), photo (base64 data URL),
                      // sale info
    trainings:[],     // training sessions, keyed by horse id: date, duration, work type,
                      // rating, notes
    health:[],        // health records, keyed by horse id: type, date, next-due date (nxt),
                      // amount, payee, payment status
    healthDocs:[],     // uploaded document/photo references (Firebase Storage refs), linked
                      // to a health record
    expenses:[],       // per-horse expenses with owner-split settlement fields
    team:[],           // team members: name, linked auth uid (if linked), permissions object
    tasks:[],          // per-horse daily tasks
    ctasks:[],         // stable-wide ("cuadra") tasks, not tied to a horse
    cexpenses:[],       // stable-wide expenses
    salerts:[],         // "session alerts" — pending items needing a response
    templates:[],       // reusable task templates
    absences:[]          // team member absence-calendar entries
  };
}
```

Board configuration and weekly/resource-board assignments (the "Boards" feature) are also
persisted inside this same document, but are not part of the static `load()` shape — they're
lazily defaulted onto `D` at render time by `ensureBoardData()` rather than initialized
up front.

### No other Firestore collections
There is no separate collection per entity type (no `horses` top-level collection, no
`trainings` collection, etc.) — everything except `users` and `stables` metadata is nested
inside the one `data/main` document per stable.

## 2. Read path

- `_fbLoadData(stableId)` (~line 429): a one-time `getDoc()` on `stables/{stableId}/data/main`,
  used to get first paint without waiting on the realtime listener.
- `_fbSetupListener(stableId)` (~line 445): attaches a Firestore `onSnapshot()` listener on
  the same document. On every remote change, it replaces the global `D` object wholesale and
  triggers a re-render — this is how multiple team members editing the same stable see each
  other's changes live. Notably, it checks `snap.metadata.hasPendingWrites === false` before
  reacting, which prevents the app from redundantly re-rendering from its own optimistic local
  write before the round-trip to the server completes.
- On listener/network failure, or before Firebase is ready, the app falls back to reading the
  same shape from `localStorage`.

## 3. Write path

- `save()` (~line 1007): debounces 250ms (so rapid successive edits, e.g. typing in a form,
  don't trigger a write per keystroke), then calls `cleanForFirestore(D)` and does a single
  `setDoc(doc(db, 'stables', stableId, 'data', 'main'), cleanD)`.
- **This is a full-document overwrite on every save** — there is no partial/field-level
  update. Toggling the status of one task rewrites the entire stable dataset (every horse,
  every training record, every health record, everything), because `D` is one JS object saved
  as one document.
- `cleanForFirestore()` recursively strips `undefined` values (Firestore rejects `undefined`
  in writes; the app converts them to `null` or omits them) before every write.
- If Firebase isn't ready/available, `save()` falls back to writing the same JSON shape into
  `localStorage` under a fixed key, so the app remains usable offline/degraded — but changes
  made in this mode do not sync to other devices/team members until Firebase becomes
  available again and a subsequent save succeeds.

## 4. Firebase Storage usage

Health-record document/photo attachments (`healthDocs`) are uploaded to Firebase Storage via
`uploadFileWithProgress()`/`uploadHealthDocs()`; only a reference/URL is stored in the
Firestore document, not the file content itself. Profile photos are resized client-side
(`resizeProfileImageFile()`) before being stored — note that **horse photos**, by contrast,
are stored as base64 data URLs directly inside the `horses` array in the Firestore document
(not Storage), which contributes directly to document-size growth (see §5).

## 5. Known limitations of this model

These are documented here as context, not fixed in this pass — see `BACKLOG.md` for
prioritization:

- **Firestore's 1 MiB per-document limit** applies to the entire stable dataset. A stable with
  enough horses, history, and inline base64 horse photos will eventually hit this ceiling.
- **Whole-document last-write-wins**: if two team members edit different things
  simultaneously (e.g. one edits a horse's notes while another marks a task done), both
  writes race to overwrite the *entire* document — the loser's change is silently dropped,
  not merged. There is no field-level conflict resolution.
- **No per-collection queries or indexes**: because everything is one document, Firestore's
  querying/indexing features (used to filter/paginate large collections server-side) are
  unavailable — all filtering happens client-side in JS after loading the entire blob.
- **No per-collection Firestore Security Rules**: access control is enforced entirely in the
  client's `canPerm()` permission logic (see FEATURES.md §3), not by Firestore rules scoped to
  sub-resources, since there are no sub-resources to scope rules to.
- **Write amplification**: every single mutation, however small, re-serializes and re-sends
  the entire dataset.

The recommended long-term direction (see `REFACTOR_PLAN.md`) is splitting this into
per-collection subcollections — e.g. `stables/{id}/horses/{hid}`,
`stables/{id}/horses/{hid}/trainings/{tid}`, `stables/{id}/tasks/{taskId}`, etc. — with
per-document `onSnapshot` listeners aggregated client-side, and storing horse photos in
Storage rather than inline base64. This is a materially larger, separate effort from the
React component migration and should not be bundled into it.
