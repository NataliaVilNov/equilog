# Horses

## Overview

The horse roster: list/search all horses in the active stable, add/edit/delete a horse
(name, breed, pedigree, multi-owner ownership splits, photo), import pedigree data from a
Horsetelex page (by URL fetch or manual paste), and open a horse's detail view with a
tabbed layout (Entrenos / Salud / Gastos / Venta). Ported from `public/legacy-app.js:1539-1696`
and `public/legacy-app.js:2576-2738` (Horsetelex import). This is the **reference-pattern
feature** for the migration — see `docs/REFACTOR_PLAN.md` §4 for why it was ported second and
what later features are expected to copy from it.

**Scope note**: this pass ports the list, form, and the detail view's *shell* (header + tab
navigation) — not the four tabs' content. That's Phase 3 (training/health/expenses/sale),
which slots into the `HorseTabs`/`HorseDetailPage` shell built here. See "Known gaps" below.

## Implementation

**Component tree**
```
src/features/horses/
  HorseListPage.jsx        — /horses route: search + list, ports rList
  HorseListItem.jsx         — one horse row
  HorseSearchBar.jsx         — search input, state lives in the ?q= URL param
  HorseFormPage.jsx           — /horses/new and /horses/:hid/edit, ports rHF
  PedigreeFields.jsx           — sire/dam/grandparents + Horsetelex link field
  OwnerSplitEditor.jsx          — multi-owner name+% editor (shared by the form; the sale
                                   tab's owner editor in Phase 3 will reuse this too)
  HorsetelexImportButton.jsx     — fetch-by-URL / paste-HTML import UI
  horsetelexParser.js             — pure HTML-scraping/name-matching functions, no DOM
                                     writes (unlike the legacy version)
  detail/
    HorseDetailPage.jsx           — /horses/:hid, ports the shell of rHorse
    HorseHeader.jsx                 — photo, owners, breed, pedigree summary
    HorseTabs.jsx                    — permission-filtered tab nav (uses components/Tabs.jsx)
src/components/EmptyState.jsx, src/components/Tabs.jsx — generic, first used here
```

**State & data**
- `StableDataContext` gained three horse mutators for this feature:
  `addHorse(horse)`, `updateHorse(horse)` (full-record replace, matching how the legacy
  save handler always rebuilds the whole record), and `deleteHorse(id)` (cascades to
  `trainings`/`health`/`healthDocs`/`expenses`/`tasks` referencing that horse id, matching
  `delHorse` at `public/legacy-app.js:1644-1653`).
- `HorseFormPage` holds all form fields in local component state (not written to
  `StableDataContext` until submit), matching the legacy form's "nothing saved until you
  press the save button" behavior.
- `HorsetelexImportButton`/`horsetelexParser.js` are pure — they take the current form
  state and a fetched/pasted HTML string and return `{updates, success}` rather than
  writing into DOM inputs directly, so `HorseFormPage` decides how to apply the result.

**Routing**
- `/horses` → `HorseListPage`
- `/horses/:hid` → `HorseDetailPage`
- `/horses/new`, `/horses/:hid/edit` → `HorseFormPage`, wrapped in
  `<PermissionRoute requires="horses">` (ports `requirePermissionView('horses', ...)` from
  `rHF`, `public/legacy-app.js:1577`)
- All of the above are also inside the outer `<ProtectedRoute>` from Phase 1.
- The horse detail view's active tab lives in the `?tab=` search param (`entrenos` default),
  same pattern as auth/stable screens established in Phase 1 — bookmarkable/shareable,
  unlike the legacy `V.tab` in-memory state.

**Permissions**
- `can('horses')` gates the list page's FAB (add button) and the form routes.
- `can('deleteItems')` gates the delete-horse button on the edit form.
- `can('reports')` gates the header's report button (see "Known gaps" — the route it links
  to isn't built yet).
- `can('health')` / `can('sale')` gate the Salud/Venta tabs in `HorseTabs`, and
  `HorseDetailPage` falls back to `entrenos` if the URL requests a tab the user can't see —
  matches `rHorse`'s tab-fallback logic (`public/legacy-app.js:1663-1665`).

**Notable decisions / deviations from the legacy behavior**
- Horse photos are read via `FileReader.readAsDataURL` with **no resizing**, matching
  legacy exactly (`public/legacy-app.js:3620-3621`) — unlike profile photos, which legacy
  does resize. This is a known data-model cost (inline base64 in the Firestore document);
  see `docs/BACKLOG.md` #3.
- `OwnerSplitEditor` is a controlled array (`{nombre, pct}[]`) with add/remove/update
  callbacks, replacing legacy's direct DOM node creation (`hfAddOwner`) and a global
  `input` event listener for the percent-sum warning (`hfCheckPct`,
  `public/legacy-app.js:3559-3582`) — the warning is now a plain derived value.
- The session-alerts/health-alerts banner at the top of the legacy horse list
  (`public/legacy-app.js:1544-1550`) and the per-horse alert badge
  (`public/legacy-app.js:1558, 1564`) are **not ported** — both depend on the Alerts
  feature, which is Phase 4. `HorseListPage` currently shows just the search bar and list.

**Known gaps / follow-ups**
- Tab *content* (training log, health records, expenses, sale/ownership editing) is not
  ported yet — `HorseDetailPage` shows a placeholder in the tab body. This is Phase 3, which
  will add `TrainingTab`/`HealthTab`/`ExpensesTab`/`SaleTab` components as children of the
  `HorseTabs` shell built here, plus a `StatGrid` component for the `.sg`/`.st` stat-tile
  pattern each tab uses (deferred rather than pre-built, since its first real consumer is
  Phase 3's `TrainingTab`, not anything in this pass).
- `HorseHeader`'s report button links to `/horses/:hid/report`, which doesn't exist until
  Phase 8 (training reports) — clicking it currently falls through the catch-all route to
  `/home`. This matches the legacy header's behavior of always showing the button when
  `canPerm('reports')` is true, regardless of whether the report feature itself works (see
  `docs/BACKLOG.md` #2 on the AI report feature's own separate problems).
