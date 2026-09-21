# Horses

## Overview

The horse roster: list/search all horses in the active stable, add/edit/delete a horse
(name, breed, pedigree, multi-owner ownership splits, photo), import pedigree data from a
Horsetelex page (by URL fetch or manual paste), and a detail view with a tabbed layout
(Entrenos / Salud / Gastos / Venta) covering training log, health records, expenses, and
sale/ownership liquidation. Ported from `public/legacy-app.js:1539-1970` and
`public/legacy-app.js:2576-2738` (Horsetelex import). This is the **reference-pattern
feature** for the migration — see `docs/REFACTOR_PLAN.md` §4 for why it was ported second and
what later features copy from it.

The list/form/detail-shell landed in Phase 2; the four detail-tab bodies (training, health,
expenses, sale) landed across Phase 3, each documented in its own doc except Sale, which has
no separate top-level feature folder and stays documented here (see below).

- Training log → `docs/components/trainings.md`
- Health records → `docs/components/health.md`
- Expenses & settlement → `docs/components/expenses.md`
- Sale/ownership liquidation → this document, §"Sale tab" below

## Implementation

**Component tree**
```
src/features/horses/
  HorseListPage.jsx        — /horses route: search + list, ports rList
  HorseListItem.jsx         — one horse row
  HorseSearchBar.jsx         — search input, state lives in the ?q= URL param
  HorseFormPage.jsx           — /horses/new and /horses/:hid/edit, ports rHF
  PedigreeFields.jsx           — sire/dam/grandparents + Horsetelex link field
  OwnerSplitEditor.jsx          — multi-owner name+% editor used by HorseFormPage (the sale
                                   tab has its own, differently-shaped editor — see below)
  HorsetelexImportButton.jsx     — fetch-by-URL / paste-HTML import UI
  horsetelexParser.js             — pure HTML-scraping/name-matching functions, no DOM
                                     writes (unlike the legacy version)
  detail/
    HorseDetailPage.jsx           — /horses/:hid, ports the shell of rHorse + owns which
                                     tab body renders
    HorseHeader.jsx                 — photo, owners, breed, pedigree summary
    HorseTabs.jsx                    — permission-filtered tab nav (uses components/Tabs.jsx)
    TrainingTab.jsx, HealthTab.jsx, ExpensesTab.jsx, SaleTab.jsx — see each tab's doc
                                     (Sale documented here, others have their own doc file)
  sale/
    SaleTab.jsx                     — the "venta" tab body, ports rHorse's tab==="venta"
                                     branch (public/legacy-app.js:1787-1970)
    SaleOwnerRow.jsx                  — one owner's editable name/% + live computed breakdown
    saleLiquidation.js                 — pure computeSaleLiquidation(horse, expenses)
src/components/EmptyState.jsx, src/components/Tabs.jsx, src/components/StatGrid.jsx — generic
```

**State & data**
- `StableDataContext` gained (across Phase 2 and Phase 3): `addHorse`/`updateHorse`
  (full-record replace)/`deleteHorse` (cascades to trainings/health/healthDocs/expenses/tasks
  for that horse id), and `updateHorseSale(hid, updater)` for the sale sub-object.
- `HorseFormPage` holds all form fields in local component state until submit, matching
  legacy's "nothing saved until you press the save button" behavior.
- `HorsetelexImportButton`/`horsetelexParser.js` are pure — they return `{updates, success}`
  rather than writing into DOM inputs directly.
- `SaleTab` has **no local draft state** — every field writes straight through
  `updateHorseSale` on change (debounced by `StableDataContext`, same as everywhere else),
  matching legacy's own no-separate-save-button venta tab.

**Routing**
- `/horses` → `HorseListPage`; `/horses/:hid` → `HorseDetailPage`.
- `/horses/new`, `/horses/:hid/edit` → `HorseFormPage`, under `<PermissionRoute requires="horses">`.
- Per-tab form routes are documented in each tab's own doc (trainings/health/expenses).
  The Sale tab has no separate route — all editing happens inline in the tab, matching legacy.
- The active detail-view tab lives in the `?tab=` search param (`entrenos` default),
  bookmarkable/shareable, unlike the legacy `V.tab` in-memory state.

**Permissions**
- `can('horses')` gates the list page's FAB and the horse form routes.
- `can('deleteItems')` gates the delete-horse button on the edit form.
- `can('reports')` gates the header's report button (still a forward-link — see Known gaps).
- `can('health')` / `can('sale')` gate the Salud/Venta tabs in `HorseTabs`; `HorseDetailPage`
  falls back to `entrenos` if the URL requests a tab the user can't see.

## Sale tab

**Overview**: shows a cost breakdown by category, lets you set a sale price, and computes a
per-owner liquidation (gross sale share minus attributed expenses plus any prize/income
share) — the most complex calculation in the app. See `docs/components/expenses.md` for the
shared split math it builds on, and `saleLiquidation.js`'s own comments for the full
attribution logic (by expense split, by payer match, or by ownership-% fallback).

**Notable decision — owner rows are locked when the horse has real owners**: legacy's venta
tab explicitly comments that the horse's own owner list is the sale's "single source of
truth" (`public/legacy-app.js:1788,1791`) and **re-syncs `sale.owners` from `horse.owners` on
every render** whenever the horse has owners set. In practice this means editing a name or
percentage in the legacy venta tab has no lasting effect for any horse with real owners — the
very next render (triggered by that same edit) overwrites it back. Rather than reproduce that
dead interactivity, this port:
- Always computes the liquidation from `horse.owners` (via the same mapping legacy's sync
  used) whenever the horse has owners — those rows render with **no** edit/add/remove
  controls and a short note pointing to the horse's edit form instead.
- Only allows live editing of `sale.owners` (name, %, add, remove, all through
  `updateHorseSale`) for the edge case of a horse with **no** owners set at all — the one
  case where legacy's sync doesn't run and manual edits genuinely persist.

This is a behavior-preserving simplification, not a feature cut: the "editable" inputs in
that first case were never functionally editable in legacy either, just visually present.

**Known gaps / follow-ups**
- `HorseHeader`'s report button links to `/horses/:hid/report`, which doesn't exist until
  Phase 8 (training reports) — clicking it currently falls through the catch-all route to
  `/home`. Matches legacy's header, which always shows the button when `canPerm('reports')`
  is true regardless of whether the report feature itself works (`docs/BACKLOG.md` #2).
- The session-alerts/health-alerts banner and per-horse alert badge on `HorseListPage`
  (`public/legacy-app.js:1544-1550,1558,1564`) are still not ported — they depend on the
  Alerts feature (Phase 4, next).
