# Health

## Overview

Per-horse health record-keeping — vaccinations, farrier visits, deworming, etc. — with
due-date tracking (color-coded overdue/upcoming/ok badges) and document attachments, either
as an external link (Drive/iCloud/Dropbox) or an uploaded file via Firebase Storage. Adding a
record with a cost automatically creates (and keeps in sync) a linked entry in `expenses`.
Ported from `public/legacy-app.js:1715-1766` (tab body), `:1995-2027` (`rNH`, the form),
`:1054-1188` (document card/upload/delete helpers).

## Implementation

**Component tree**
```
src/features/health/
  HealthFormPage.jsx      — /horses/:hid/health/new, /horses/:hid/health/:eid/edit, ports rNH
  HealthRecordCard.jsx     — one record row with due-date badge, ports the "salud" tab's
                              record list item
  HealthDocCard.jsx         — one attached document, ports healthDocCard +
                              healthDocIcon/healthDocCategoryLabel/fileSizeLabel
  HealthDocUploader.jsx      — the link-add form and the Storage-upload-with-progress form
src/features/horses/detail/HealthTab.jsx — the "salud" tab body
```

**State & data**
- Health records live at `stables/{stableId}/horses/{hid}/health/{healthId}`, and attached
  documents at `stables/{stableId}/horses/{hid}/healthDocs/{docId}` — both aggregated
  stable-wide via a `collectionGroup` listener (see `docs/DATABASE.md`). `StableDataContext`
  gained, in two commits:
  - `addHealthRecord`/`updateHealthRecord`/`deleteHealthRecord` — the first two also create
    or update a linked entry in the horse's `expenses` subcollection (matched by `healthId`)
    whenever the record's `amount > 0`, written in the same `writeBatch` as the health record
    so both commit together — exactly mirroring the legacy save handler's branching
    (add-linked / update-linked / leave-alone-if-amount-drops-to-zero).
  - `addHealthDocLink`/`uploadHealthDocs`/`deleteHealthDoc` — the Storage-backed document
    mutators. `uploadHealthDocs` takes an array of files and an `onProgress(label, pct)`
    callback (replacing legacy's direct DOM status writes), uploads each to
    `stables/{stableId}/horses/{hid}/health_docs/...` in Storage, and writes all resulting
    doc records to Firestore in a single `writeBatch` once every upload finishes — matching
    legacy's one-loop one-save batching.
- These mutators don't read `AuthContext` themselves (contexts stay decoupled, same pattern
  as Phase 1); the calling components (`HealthDocUploader`) read the current user's `uid`
  from `AuthContext` and pass it in explicitly for `createdBy`/`uploadedBy` fields.

**Routing**
- `/horses/:hid/health/new`, `/horses/:hid/health/:eid/edit` → `HealthFormPage`, wrapped in
  `<PermissionRoute requires="health">` (ports `requirePermissionView('health', ...)`).

**Permissions**
- `can('health')` gates the form routes and whether `HealthDocUploader` renders in the tab.
- `can('deleteItems') || can('health')` gates a document's delete button (ports
  `healthDocCard`'s `canDel` check, `public/legacy-app.js:1073`).
- `can('deleteItems')` gates a health record's delete button.

**Notable decisions / deviations from the legacy behavior**
- `uploadFileWithProgress` reports progress via a callback instead of writing directly to a
  DOM status element — `HealthDocUploader` owns that status text as component state.
- The file-size limit (25 MB) and the accepted-file-types list are preserved exactly.

**Known gaps / follow-ups**
- None outside what's already tracked in `docs/BACKLOG.md`.
