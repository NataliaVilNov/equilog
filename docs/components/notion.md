# Notion export

## Overview

"↻ Enviar a Notion" pushes health records and weekly-board cells to a Notion database. It is
inspired by the reference "pizarra semanal" app's "Sincronizar Notion" button, but not a port:
that app synced one VET record per horse+day through a Cloudflare Worker holding the token;
EquiLog has no server, so it talks to Notion directly from the browser (below), and covers all
health records and the weekly plan, not just VET.

## How it works

**Connection** (`NotionSettingsSheet.jsx`, opened from More → Notion or from a sync button on an
unconnected device). Two separate things:
- *Per stable, once, by an admin:* in Notion create an internal integration, share a page with
  it, then paste its token and the page link in EquiLog. EquiLog validates the token
  (`GET /users/me`), the page (`GET /pages/{id}`), creates the database under that page
  (`POST /databases` with `initial_data_source`) and saves the **non-secret** ids in
  `stables/{sid}/integrations/notion` (`databaseId`, `dataSourceId`, `databaseUrl`,
  `parentPageId`, `createdBy`, `createdAt`).
- *Per person and device:* the integration token, kept **only in `localStorage`**
  (`equilog:notion-token:<uid>`, `notionStorage.js`). It is never written to Firestore (every
  stable member can read stable docs) and never part of the build (`VITE_*` is public). Each
  person who syncs needs their own integration shared with the page; "Desconectar este
  dispositivo" deletes the token.

**Why browser-direct.** `api.notion.com` currently answers browser (CORS) requests —
observed (OPTIONS 204, `Access-Control-Allow-Origin: *`), **not documented**, so Notion could
stop it. `notionClient.js` takes a `baseUrl`, the one place to repoint at a serverless proxy
(Cloudflare Worker verifying the Firebase ID token and holding the token as a secret) if that
happens; that proxy would also fix BACKLOG #2 (the Anthropic reports). The residual risk of the
current design: the token is readable by anything running in that browser profile.

**The database** (`notionSchema.js`, property names reuse the reference app's Spanish ones):
`Registro` (title, "Horse · label"), `Fecha`, `Tipo` (Veterinario, Vacuna, Herraje,
Desparasitación, Otro, Plan semanal), `Caballo`, `Informe / notas`, `Próxima revisión`,
`Importe`, `Pago`, `Actividades` (multi-select), `EquiLog ID` (the dedupe key).

**What is sent**
- *Health records* (`buildHealthPage`): type → `Tipo`; a record some weekly-board cell points at
  through `vetHealthId` (the board's VET second-tap flow) is sent as `Veterinario`.
- *Weekly-board cells* (`buildPlanPage`): one page per horse+day with activities and notes
  (+ "Hecho: …"); empty cells are not sent.
- Not sent: expenses, tasks, horses.

**Syncing** (`notionSync.js`, `useNotionSync.js`) — manual only, idempotent, safe to re-run:
- Each item's properties get a `hash`. Links `stables/{sid}/notionLinks/{key}` (`key` =
  `health__<id>` / `plan__<hid>__<date>`; `{pageId, hash, kind, hid, date, syncedAt}`) record
  what was sent. Same hash → skipped; changed → `PATCH` the same page; no link → look for an
  orphan page by `EquiLog ID` first (a run that created a page but died before saving the link —
  the reference app's duplicate bug), else create.
- The link is saved only after the page exists. A page deleted/archived by hand in Notion is
  recreated.
- A weekly-board cell erased after being sent has its page **archived** (never hard-deleted).
  Deleted health records keep their page (the health list may be incomplete while loading;
  archiving on a partial list would wipe live pages).
- Only the properties EquiLog writes are PATCHed, so manual edits to other columns survive
  (the reference reset `Estado seguimiento` on every sync).
- Requests are sequential at ~3/s (the non-Business Notion limit); 429 waits `Retry-After`
  (max 3 retries); 5xx is retried only for GET/PATCH/queries, never a create; 401/403/404 stops
  the run with a Spanish explanation, other errors are counted and the run continues.
- Result toast: "3 enviados · 2 sin cambios · 1 con error".

**Where the buttons are:** weekly board ("Enviar semana a Notion": the visible week's cells +
health records dated that week) and a horse's Salud tab (that horse's records). Hidden without
the `health` permission.

## Firestore rules

`integrations/{doc}`: read = member, write = owner/admin. `notionLinks/{key}`: read/write =
`myPerm(stableId, 'health')`. Both are new blocks in `firestore.rules` and must be **published in
the Firebase console** before the feature works (until then the connect sheet reports "Missing or
insufficient permissions"). Reads are one-shot (`getDoc`/`getDocs` on demand), so a stable that
never uses Notion has no listener.

## Tests

`src/features/notion/notion.test.js` (vitest): property builders, hash, page-id parsing, client
(headers, 429/5xx retries, error messages, create-database), and the sync loop with fake
clients (create, skip, patch, adopt orphan, recreate deleted, link-after-success, abort on 401,
archive in scope, progress/summary). Not covered automatically: the real Notion API and Firestore.

## Known limits

- Undocumented browser CORS; token on the device (see above).
- Notion-Version is pinned to `2025-09-03`; a newer version (`2026-03-11` renames `archived` →
  `in_trash`) needs the archive call updated.
- One-way: nothing is read back from Notion.
