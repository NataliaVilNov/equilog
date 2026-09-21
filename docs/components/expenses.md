# Expenses

## Overview

Per-horse expense tracking, optional percentage-based cost splitting among multiple owners,
and a Tricount-style settlement flow that calculates who owes whom and marks expenses as
settled once confirmed. Ported from `public/legacy-app.js:1768-1785` (tab body), `:2069-2130`
(`rNE`, the form), `:2030-2067` (`rExpenseSettlement`), and `:894-976` (the split/settlement
math).

## Implementation

**Component tree**
```
src/features/expenses/
  expenseSplits.js          — pure split & Tricount-settlement math, no DOM/global reads
  ExpenseFormPage.jsx         — /horses/:hid/expenses/new, /horses/:hid/expenses/:eid/edit,
                                 ports rNE
  ExpenseSettlementPage.jsx    — /horses/:hid/expenses/settlement, ports rExpenseSettlement +
                                 renderSettlementPreview + confirmExpenseSettlement
src/features/horses/detail/ExpensesTab.jsx — the "gastos" tab body
```

**State & data**
- `StableDataContext` gained `addExpense`, `updateExpense`, `deleteExpense` (`deleteExpense`
  deliberately does **not** touch a health record even if the expense was auto-created from
  one — matches the legacy comment at `public/legacy-app.js:2138`), and
  `addExpenseSettlement(settlement)`, which appends to the `expenseSettlements` collection
  (see the `fix:` commit earlier in this phase that added it to `StableDataContext`'s tracked
  collections) and marks every settled expense's `settled`/`settlementId`/`settledDate`.
- `expenseSplits.js` exports `calcOwnerSettlement(horse, expenses, ids)` — the Tricount-style
  greedy debtor/creditor matching algorithm, ported byte-for-byte from legacy's
  `calcOwnerSettlement`. It's a pure function (no context, no DOM), making it this phase's
  best unit-test candidate once a test runner exists.
- `ExpenseSettlementPage` recomputes the live settlement preview via `calcOwnerSettlement`
  on every checkbox toggle — no separate "preview" state, the checked-expense-id list is the
  only state, and the preview is derived from it each render (simpler than legacy's imperative
  `renderSettlementPreview()` re-render-on-demand call).

**Routing**
- `/horses/:hid/expenses/new`, `/horses/:hid/expenses/:eid/edit`,
  `/horses/:hid/expenses/settlement` → wrapped in `<PermissionRoute requires="expenses">`.

**Permissions**
- `can('expenses')` gates the form/settlement routes and an expense's delete button.
- `isAdmin` (not a specific permission key) gates the tab's total/pending stat grid, matching
  legacy's `${admin?...:''}` check (`public/legacy-app.js:1769`) rather than a `can()` call.

**Notable decisions / deviations from the legacy behavior**
- `ExpenseFormPage` defaults a *new* expense's category to `EK[0].id` ("vet") instead of
  legacy's literal `"servicio"` default, which doesn't match any real category id — in legacy
  this meant the category pill row visually shows "Veterinario" active (index 0) while the
  hidden input actually held the non-matching value `"servicio"` until a pill was clicked. A
  React port needs its state and its display to agree, so the mismatch was corrected rather
  than reproduced; the corrected default is what was already showing on screen anyway.
- The payer field's owner-`<select>` / manual-`<input>` toggle is now derived each render from
  whether the current `payer` string matches an owner's name, rather than legacy's
  imperative "which element is visible" DOM toggling — same end behavior.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
