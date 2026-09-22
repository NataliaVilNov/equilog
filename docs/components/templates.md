# Task templates

## Overview

Reusable sets of tasks (horse + activity + assignee + duration each) saved under a name and
applied to any day in one tap, instead of re-creating the same recurring set of tasks by
hand each morning. Ported from `public/legacy-app.js:3488-3551`.

## Implementation

**Component tree**
```
src/features/templates/
  TemplatesPage.jsx        — /templates, ports rTpls
  TemplateFormPage.jsx       — /templates/new, /templates/:tplid/edit, ports rETpl/addTT
```

**State & data**
- `StableDataContext` gained `addTemplate`, `updateTemplate`, `deleteTemplate`, and
  `applyTemplate(templateId, date)` — the last one builds every new task from the template's
  task list and writes them all in a single `updateData` call, matching legacy's
  single-loop-then-one-`save()` batching (`public/legacy-app.js:3503-3507`) rather than N
  separate task-adds.
- `TemplateFormPage` holds the in-progress task list as local component state, replacing
  legacy's `V._tt` view-state field — same "nothing saved until you press Guardar" behavior
  as every other form in this migration.

**Routing**
- `/templates`, `/templates/new`, `/templates/:tplid/edit` — all three under
  `<PermissionRoute requires="team">`, matching legacy's `requirePermissionView('team', ...)`
  gate on both `rTpls` and `rETpl` even though templates are reached from the day board
  (`docs/components/tasks.md`), not the team screen.

**Permissions**
- `can('team')` gates every route in this feature, and the templates list page's FAB.
- The delete button on `TemplateFormPage` is **not** additionally gated by
  `can('deleteItems')` — matches legacy, which shows it unconditionally once you already
  have `team` access (`public/legacy-app.js:3537`).

**Notable decisions / deviations from the legacy behavior**
- None — a close, direct port.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.

---

This closes out Phase 4 (`docs/REFACTOR_PLAN.md` §4) — daily workflow (tasks/day board,
alerts, home dashboard, templates) is fully ported. Phase 5 (team & stable-wide management)
is next.
