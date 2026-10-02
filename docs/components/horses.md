# Horses

## Overview

The horse roster: list/search all horses in the active stable, add/edit/delete a horse
(name, breed, pedigree, multi-owner ownership splits, photo), import pedigree data from a
Horsetelex page (pasted page source or clipboard bookmarklet — never fetched), and a detail view with a tabbed layout
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
  HorseAccessEditor.jsx          — admin-only "Acceso" section in HorseFormPage (see below)
  horseAccess.js                  — isHorseRestricted()/canViewHorseInfo(), the single source
                                     of truth for the per-horse restriction check below
  HorsetelexImportButton.jsx     — "Importar de Horsetelex" sheet: paste source → preview → apply
  horsetelexBookmarklet.js        — bookmarklet source (copies the open Horsetelex page's data)
  horsetelexParser.js             — pure string/JSON parser, no DOM; tests: horsetelexParser.test.js
  __fixtures__/horsetelex-emerald.html — trimmed real page source used by the tests
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
src/components/AccessLimited.jsx — "🔒 Acceso limitado" block, extracted from PermissionRoute.jsx
                                    so it can also render mid-component (ExpenseFormPage,
                                    ExpenseSettlementPage, HorseFormPage), not just as a route wrapper
```

**State & data**
- Horses live at `stables/{stableId}/horses/{horseId}`, one document per horse (moved off the
  single-document-per-stable model — see `docs/DATABASE.md`). `StableDataContext` gained
  `addHorse`/`updateHorse` (full-record `setDoc`)/`deleteHorse` (deletes the horse doc plus
  its `trainings`/`health`/`healthDocs`/`expenses` subcollections and any `tasks` docs
  referencing it), and `updateHorseSale(hid, updater)`, which now patches just the horse doc's
  `sale` field instead of rewriting the whole document.
- **Photos are uploaded to Storage, not inlined as base64.** `uploadHorsePhoto(hid, file,
  onProgress)` uploads to `stables/{stableId}/horses/{hid}/photo/...` and returns `{path,
  url}`, which `HorseFormPage` stores as the horse's `photo` field (an object, not a raw data
  URL string — every read site does `horse.photo.url`, not `horse.photo`). A new horse's id
  is generated up front (`uid()`, before the photo is even picked) so the upload has a final
  path to target immediately, the same trick `uploadHealthDocs` already used.
- `reorderHorses(orderedIds)` (added for the weekly-board rework, not a legacy port — legacy
  never had horse ordering) sets each horse's `sortOrder` to its index in `orderedIds`.
  `horses/horseOrder.js`'s `sortHorsesByOrder` applies it — used by both `HorseListPage` and
  the weekly board's row order, so the order is shared between the two. `HorseListPage`'s
  "Reordenar" toggle shows plain ↑/↓ buttons (no drag-and-drop, matching how the rest of this
  app avoids introducing new drag interactions); horses without a `sortOrder` yet tie at the
  end in their existing order, so every stable's current order is preserved until someone
  explicitly reorders.
- `HorseFormPage` holds all form fields in local component state until submit, matching
  legacy's "nothing saved until you press the save button" behavior.
- **Horsetelex import** — EquiLog never contacts horsetelex.com: it is behind a Cloudflare bot
  challenge (403 for every automated request) and sends no CORS headers, so neither a proxy nor
  a server-side fetch is viable, and bypassing the challenge is out of scope. Instead the user
  opens the horse page in their own browser and hands the page over: Ctrl+U → Ctrl+A → Ctrl+C →
  paste into the sheet, or click the "Copiar de Horsetelex" bookmarklet on the page and use
  "Pegar del portapapeles" (the bookmarklet is untested against the live site's CSP; the Ctrl+U
  route is the fallback). The site is an Angular Universal app: its server-rendered HTML carries
  a `<script id="serverApp-state">` with the JSON of the page's API calls (entities escaped as
  `&q; &a; &s; &l; &g;`), including `…/pedigrees/family-tree` with the horse and 3 generations
  of ancestors (name, birth year, studbook, breeder, registration…). `parseHorsetelexSource()`
  reads that and returns `null` for anything else (copied visible text doesn't work, nor does a
  Cloudflare challenge page — the sheet says so). `buildHorsetelexUpdates()` returns the form
  fields to set: the six pedigree names always; name/breed/dob/origin/link only when empty
  unless "sobrescribir" is ticked. Horsetelex gives the birth *year* only, so `dob` is left
  alone (a full `foaldate` is used when present). The form applies the result to its own
  state; nothing is saved until "Guardar caballo". Both functions are pure (no DOM), which is
  what makes them testable in Node (`npm test`).
- `SaleTab` has **no local draft state** — every field writes straight through
  `updateHorseSale` on change, matching legacy's own no-separate-save-button venta tab. This
  now means one Firestore write per keystroke (no debouncing since the schema migration —
  see `docs/DATABASE.md` §5) rather than the 250ms-debounced write it had before; tracked as a
  minor follow-up in `docs/BACKLOG.md`, not fixed in this pass.
- **Per-horse access restriction**: a horse's `allowedUids` field (null/absent = legacy,
  visible to everyone with `can('horses')`; an array = restricted to admins + those uids —
  see `docs/DATABASE.md` §1) gates the horse's own profile fields and its `expenses`
  subcollection. `horseAccess.js`'s `canViewHorseInfo(horse, isAdmin, uid)` is the one check
  every gated component below calls:
  - `HorseHeader` shows only `horse.name`/photo for an unauthorized restricted horse — breed,
    pedigree, owners, dates, notes, and the Horsetelex link are hidden, replaced by a
    "🔒 Información restringida" line.
  - `HorseTabs` hides the Gastos tab entirely, and ANDs the check into the existing `can('sale')`
    gate for Venta, when unauthorized. Entrenos/Salud are untouched — trainings and health are
    explicitly **not** part of this restriction.
  - `HorseDetailPage` redirects `?tab=gastos`/`?tab=venta` back to `entrenos` for an
    unauthorized direct link, the same fallback pattern already used for `?tab=salud` without
    `can('health')`.
  - `HorseListItem` hides the owner/breed subtitle (keeps name, photo, training count).
  - `HorseFormPage` itself is blocked (`<AccessLimited/>`) for an unauthorized editor of a
    restricted horse. Its new "Acceso" section (`HorseAccessEditor.jsx`) is admin-only
    editable — a checkbox to restrict the horse plus a picker over `team`, limited to members
    who've already linked an account (have a resolvable `uid`/`userId`/`authUid` —
    `usePermissions.js`'s matching logic); an authorized non-admin sees a read-only
    "Compartido con: …" line instead. Since `addHorse`/`updateHorse` write via a full-document
    `setDoc` (no merge), a non-admin's save must carry the existing `allowedUids` forward
    unchanged — the same reason `horse.sale` already gets this treatment on every save.
  - `ExpenseFormPage`/`ExpenseSettlementPage` (reached directly by route, not just through the
    tab) get the identical guard — these had **no** horse-specific check before this feature.
  - **Enforcement is split by data shape, a deliberate tradeoff**: `expenses` is a real
    subcollection, so it gets genuine Firestore-rules enforcement (`firestore.rules`,
    `docs/DATABASE.md` §4). The horse's profile fields live on the same `horses/{hid}`
    document everyone already reads for the name (needed by Boards/Tasks/lists, which this
    feature deliberately leaves untouched) — Firestore can't restrict individual fields
    within one document, so hiding those fields is a client-side UI gate only, not a database
    guarantee.
  - Non-admin team members read `expenses` through a different listener shape than admins —
    see `docs/DATABASE.md` §4 for why (a Firestore `list`-query constraint, not a design
    preference) and `StableDataContext.jsx`'s expenses effect.

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
- Independently of the permission-key checks above, a restricted horse's `allowedUids` gates
  the Gastos/Venta tabs, the horse's profile fields, and the horse-edit form to admins and the
  listed members only — see "Per-horse access restriction" above.

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

**Gated the same way as the Gastos tab**: Venta depends on `expenses` for its liquidation
math, and `expenses` is the one part of this feature with real Firestore-level enforcement
(see "Per-horse access restriction" above) — showing the tab to an unauthorized user would
just render a broken/empty liquidation, so it's hidden client-side for the same reason Gastos
is, on top of its existing `can('sale')` gate.

**Known gaps / follow-ups**
- `HorseHeader`'s report button links to `/horses/:hid/report`, which doesn't exist until
  Phase 8 (training reports) — clicking it currently falls through the catch-all route to
  `/home`. Matches legacy's header, which always shows the button when `canPerm('reports')`
  is true regardless of whether the report feature itself works (`docs/BACKLOG.md` #2).
- The session-alerts/health-alerts banner and per-horse alert badge on `HorseListPage`
  (`public/legacy-app.js:1544-1550,1558,1564`) are still not ported — they depend on the
  Alerts feature (Phase 4, next).
