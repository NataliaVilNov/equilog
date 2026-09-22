# Reports (AI-generated)

## Overview

Two AI-generated report features, both calling the Anthropic Messages API directly from the
browser and rendering the same `**Heading**`-as-markdown-ish response format: a per-horse
training report (date range → training-session analysis for the owner) and a team activity
report (`docs/components/team.md`, Phase 5 — date range + report type → stable-wide
activity summary for the team). The per-horse report also exports to PDF. Ported from
`public/legacy-app.js:2154-2207` (training report) and `public/legacy-app.js:3444-3486`
(team report).

## Implementation

**Component tree**
```
src/features/reports/
  pdfExport.js            — exportTrainingReportPdf(horse, text, range), ports expPDF
  TrainingReportPage.jsx    — /horses/:hid/report, ports rRep/genRep

src/features/team/
  TeamReportPage.jsx         — /team/report, ports rTR/genTR (Phase 5)
```

**State & data**
- Both pages are read-only against `StableDataContext` (trainings/tasks/horses) — no new
  mutators. The generated report text, loading state, and error state all live as local
  component state; nothing is persisted.
- `pdfExport.js` uses the `jspdf` npm package (`chore: add jspdf dependency`) instead of the
  `window.jspdf` global legacy loads from a CDN `<script>` tag (`index.html:10`) — the CDN
  tag stays in place until the Phase 8c cutover removes the legacy entry point entirely;
  until then both the legacy app and this port can independently render PDFs.

**Routing**
- `/horses/:hid/report` under `<PermissionRoute requires="reports">` — resolves the
  forward-link `HorseHeader`/`TrainingTab` have pointed at since Phase 2/3.
- `/team/report` under `<PermissionRoute requires="team">` (Phase 5).

**Permissions**
- `can('reports')` gates the training-report route; `can('team')` gates the team-report
  route (matching legacy's own gating, not a shared "reports" permission).

**Notable decisions / deviations from the legacy behavior**
- **`genRep`/`genTR`'s direct client-side Anthropic `fetch` call is ported exactly as legacy
  has it** — no API key, identical request shape — rather than either silently fixing it
  (adding a key would be a real security decision, not a refactor) or cutting the feature
  (not asked for). It fails the same way it already fails in production; this is parity,
  not a regression. The real fix — a server-side proxy that holds the key — is already
  tracked as `docs/BACKLOG.md` #2 and is out of scope for this migration.

**Known gaps / follow-ups**
- The Anthropic API key/proxy issue above (`docs/BACKLOG.md` #2).
- No other gaps beyond what's already tracked in `docs/BACKLOG.md`.
