# Trainings

## Overview

Per-horse training session log — record what work a horse did (type, duration, rating
1-10, state/feel/notes), see all past sessions on the horse's "Entrenos" tab, and derived
stats (session count, average rating, total minutes). Ported from
`public/legacy-app.js:1698-1713` (tab body), `:1975-1993` (`rNT`, the form), and
`:1704-1711` (the training card).

## Implementation

**Component tree**
```
src/features/trainings/
  TrainingFormPage.jsx   — /horses/:hid/trainings/new, ports rNT
  TrainingCard.jsx         — one session row, used by TrainingTab and (Phase 4) HomePage
src/features/horses/detail/TrainingTab.jsx — the "entrenos" tab body, ports rHorse's
                                              tab==="entrenos" branch
```

**State & data**
- Trainings live at `stables/{stableId}/horses/{hid}/trainings/{trainingId}`, one document per
  session (a `collectionGroup` listener aggregates every horse's trainings for the stable —
  see `docs/DATABASE.md`). `StableDataContext` gained `addTraining(training)` and
  `deleteTraining(id)`. There's no `updateTraining` — the legacy app has no training-edit UI
  either, only add and delete.
- `TrainingTab` derives its stats (session count, average rating, total minutes) from the
  `trainings` slice filtered to the current horse, memoized with `useMemo`.

**Routing**
- `/horses/:hid/trainings/new` → `TrainingFormPage`, wrapped in
  `<PermissionRoute requires="trainings">` (ports `requirePermissionView('trainings', ...)`
  from `rNT`, `public/legacy-app.js:1976`).
- No edit route, matching legacy.

**Permissions**
- `can('trainings')` gates the form route.
- `can('deleteItems')` gates each `TrainingCard`'s delete button.
- `can('reports')` gates the tab's "Informe" button.

**Notable decisions / deviations from the legacy behavior**
- The option-group pill selectors for work type (`WK`) and the 1-10 rating grid — legacy's
  `so()`/`sr()` DOM-class-toggling helpers — become plain controlled React state
  (`wtype`/`rating`) with no DOM manipulation.
- The voice-dictation mic button on the "Sensaciones"/"Observaciones" fields (legacy's
  `voice()`, `public/legacy-app.js:2745`, Web Speech API) is **not ported** — see known gaps.

**Known gaps / follow-ups**
- Voice dictation is not ported. It's a self-contained browser API feature that degrades
  gracefully in legacy (a toast when unsupported) and isn't core to the data model; revisit
  as a standalone addition later if wanted, rather than bundling it into this port.
- The tab's "Informe" (report) button links to `/horses/:hid/report`, which doesn't exist
  until Phase 8 (training reports) — same deferred-link pattern already used for the
  horse-detail header's report button (`docs/components/horses.md`).
