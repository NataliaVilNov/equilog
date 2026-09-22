# Smart Order ("Orden inteligente")

## Overview

Parses a free-text instruction — typically a pasted WhatsApp message like "Mañana Fandango
paddock y caminador. A Nerón montarlo suave 30 minutos." — into draft tasks, health records,
and expenses via fuzzy horse/person name matching, keyword-based activity/health/amount
extraction, and lightweight clause splitting. The user reviews the draft (reassigning an
uncertain horse or person, unchecking anything wrong) before confirming, which creates the
selected records in one batch. Ported from `public/legacy-app.js:2749-3123`.

## Implementation

**Component tree**
```
src/features/smart-order/
  matching.js            — pure scored-key primitives shared by person/horse matching
  personMatching.js        — pure person fuzzy-matching (soAllPersonMatches/soPerson)
  horseMatching.js           — pure horse fuzzy-matching, candidate-group tracking,
                                bulk "todos los caballos [menos X]" selection
  extractors.js                — pure date/duration/amount/activity/health keyword extraction
  clauseSplitting.js             — pure WhatsApp-style clause segmentation
  buildDraft.js                   — pure buildSmartOrderDraft(text, date, ctx), composes
                                     all of the above into the final draft-item list
  SmartOrderDraftItem.jsx           — one draft row: checkbox, horse/person reassignment
  SmartOrderReview.jsx                — draft list + Limpiar/Confirmar footer
  SmartOrderPage.jsx                   — /smart-order, ports rSmartOrder
```

**State & data**
- Of the ~20 `so*` helper functions in legacy, all but four (`smartAnalyzeOrder`,
  `renderSmartReview`, `smartChangeHorse`/`smartChangePerson`, `confirmSmartOrder`) were
  already pure — those four were impure only because they read `gv()`/queried the DOM
  directly, which disappears naturally once they're React state. `buildSmartOrderDraft`
  ports `smartAnalyzeOrder` as one pure function; `SmartOrderPage` holds the parsed result
  and per-item edits as component state instead.
- `StableDataContext` gained `confirmSmartOrderDraft(items)` — ports the write side of
  `confirmSmartOrder`: builds `tasks`/`health`/`expenses` records from the given items and
  writes them all in one `updateData` call (same batching precedent as `applyTemplate`,
  Phase 4). The caller (`SmartOrderPage`) is responsible for filtering down to
  `item.checked && item.allowed` first — the mutator just builds records from whatever list
  it's given, matching the split used throughout this context.
- **One deliberate fix**: each draft item from `buildSmartOrderDraft` gets a `checked`
  boolean (defaulting to `allowed`), because legacy's `confirmSmartOrder` reads live
  `.so-check` DOM checkboxes instead of storing checked-state on the draft itself — there's
  no React-idiomatic equivalent of "query the DOM for checked boxes", so the state has to
  live somewhere, and the draft item is the obvious place. The set of items a user can end
  up confirming is identical to legacy's.
- `buildSmartOrderDraft` returns `{ items, noHorsesFound }` instead of legacy's single
  `V.smartDraft` array, to preserve legacy's two distinct empty states: `noHorsesFound` true
  means even the segment-based fallback parser recognized no horse at all (legacy's early
  return before ever calling `renderSmartReview`); `items` empty with `noHorsesFound` false
  means horses were recognized but nothing usable was extracted from them (legacy's
  `renderSmartReview` own empty-list branch). `SmartOrderReview` shows a different message
  for each.

**Routing**
- `/smart-order` (reads `?d=` for the default date, matching the day board's forward-link)
  under `<PermissionRoute requires={["tasks", "health", "expenses"]}>` — the first feature
  in this migration gated on more than one permission at once (any-of semantics, ported
  from `canPerm('tasks')||canPerm('health')||canPerm('expenses')`,
  `public/legacy-app.js:3162`). `PermissionRoute` gained array support for this
  (`src/routes/PermissionRoute.jsx`); every prior `requires="single-key"` usage keeps
  working unchanged.

**Permissions**
- The route-level gate above controls whether the page is reachable at all. Within the page,
  each draft item also carries its own `allowed` flag (`canPerm('tasks')`/`canPerm('health')`/
  `canPerm('expenses')` per item kind) — a user with only `tasks` access can still analyze an
  order that detects a health record, see it in the draft with a "sin permiso" note, but
  can't check or confirm it.

**Notable decisions / deviations from the legacy behavior**
- The 🎤 voice-input button is not ported — same scope cut as the training/session-report
  forms (Phases 3-4), see `docs/BACKLOG.md`.
- A health draft item created here never auto-creates a linked expense the way the regular
  `HealthFormPage` flow does (`docs/components/health.md`) — legacy's own
  `smartAnalyzeOrder` already emits a separate sibling `expense` draft item when an amount
  was detected alongside a health item, so the two stay independent records both in legacy
  and here.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
