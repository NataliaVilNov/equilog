# Stats ("Estadísticas")

## Overview

A read-only stable-wide dashboard across three tabs — Financiero (income/expenses balance,
per-horse breakdown, transaction detail), Equipo (task completion and hours per team
member), Caballos (training session counts, average ratings, hours-per-month chart) —
filterable by horse, owner, and date range. Ported from `public/legacy-app.js:2404-2572`.

## Implementation

**Component tree**
```
src/features/stats/
  StatsPage.jsx   — /stats, ports rStats (filter bar + three tab bodies, all in one file,
                     same "kept as one component" call made for HomePage in Phase 4 — the
                     tab bodies are small local components in the same file, not split into
                     their own files/routes since nothing else reuses them)
```

**State & data**
- Purely a reader: `horses`, `trainings`, `expenses`, `cexpenses`, `tasks`, `team`, `health`
  from `StableDataContext`. No new mutators.
- All filter state (`?horse=`, `?owner=`, `?from=`, `?to=`, `?tab=`) lives in URL search
  params, same pattern as every other stateful view in this migration.
- The owners dropdown is built from `ownerListForHorse` (`src/features/expenses/
  expenseSplits.js`, Phase 3), reused here rather than re-deriving the owners-collection
  logic a second time.

**Routing**
- `/stats` (matches the forward-link `HomePage`, Phase 4, already pointed at) under
  `<PermissionRoute requires="stats">`.

**Permissions**
- `can('stats')` gates the whole route.

**Notable decisions / deviations from the legacy behavior**
- None — a close, direct port. The one visual detail worth noting: the "Balance" stat tile
  colors only its value text conditionally (green if non-negative, red if negative) rather
  than the whole tile, which doesn't fit `StatGrid`'s per-tile `tone` API — that one tile is
  hand-rolled with the same markup `StatGrid` produces instead of forcing it through that
  component.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
