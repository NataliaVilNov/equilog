# Stables (multi-stable management)

## Overview

A user can belong to multiple "stables" (cuadras). This feature covers: listing the stables
you belong to, creating a new one, joining an existing one via invite code, switching which
stable is active, and managing the active one (delete it if you're the owner/admin, or leave
it if you're a member) — plus linking your user account to a specific team member profile
when you join through a general (not person-specific) invite code. Ported from
`public/legacy-app.js:329-874` and the corresponding `index.html` screens/modals
(`#stable-screen`, `#create-stable-modal`, `#join-team-modal`, `#stable-panel`).

## Implementation

**Component tree**
```
src/features/stables/
  StableListScreen.jsx   — the /stables route: list + "Salir" logout + entry points below
  CreateStableModal.jsx   — name/description form, opened from StableListScreen
  JoinByCodeForm.jsx       — invite-code input, embedded in StableListScreen
  StablePanel.jsx           — slide-up panel (opened from AppHeader's logo button):
                              active stable info, switch/delete/leave
  JoinTeamModal.jsx          — "which team member are you" picker, shown whenever
                              StableSelectionContext.pendingJoin is set
src/contexts/StableSelectionContext.jsx — all state and mutators for this feature
```

**State & data**
- `StableSelectionContext` owns: `stables` (the user's stable list), `activeStableId` /
  `activeStable`, `pendingJoin` (replaces the legacy module-level `_pendingJoin`), `loading`,
  `error`.
- Mutators: `refreshStables`, `switchStable`, `createStable`, `joinByCode`, `confirmJoinAs`,
  `cancelJoin`, `deleteStable`, `leaveStable`, `exitActiveStable`. Each ports its
  same-named (or close) legacy function — see the `// Ports ...` comments in
  `StableSelectionContext.jsx` for the exact `public/legacy-app.js` line ranges.
- These mutators read/write `stables/{id}` metadata docs directly (not through
  `StableDataContext`, which only knows about `stables/{id}/data/main`). `joinByCode` and
  `confirmJoinAs` also read/write the target stable's `data/main.team` array to link a user
  to a team member — see `docs/DATABASE.md` for how that document is shaped.
- Once `switchStable`/`createStable`/`confirmJoinAs` sets `activeStableId`,
  `StableDataScope` in `src/App.jsx` passes it to `StableDataProvider` as a prop, which
  starts that stable's realtime data subscription — this feature only manages *which* stable
  is active, not its operational data.

**Routing**
- `StableListScreen` is mounted at `/stables` (`src/routes/routes.jsx`).
- `ProtectedRoute` redirects here whenever a user is signed in but has no `activeStableId`.

**Permissions**
- `deleteStable` requires `canManageStable(activeStable, user)` — true if the user is the
  stable's `ownerId` or has `role: 'admin'` in its `members` map (`src/lib/permissions.js`).
- `leaveStable` blocks the stable's owner (must delete instead) and blocks leaving if the
  user is the only member.

**Notable decisions / deviations from the legacy behavior**
- The legacy `_pendingJoin` module-level variable becomes `StableSelectionContext`'s
  `pendingJoin` state — `JoinTeamModal` renders whenever it's non-null and clears it via
  `cancelJoin`/`confirmJoinAs`, rather than the legacy imperative
  `showJoinTeamModal`/`closeJoinTeamModal` DOM toggling.
- `CreateStableModal` is opened via plain component state local to `StableListScreen`
  (only one consumer ever opens it), while `StablePanel` is opened via the shared
  `ModalContext` (`openModal("stablePanel")` from `AppHeader`'s logo button, since it can be
  triggered from anywhere `AppHeader` is mounted) and `JoinTeamModal` is always mounted in
  `App.jsx` and self-gates on `pendingJoin`. Three different modals, three different
  ownership shapes — each matches how many places can trigger it.
- Destructive actions (delete/leave a stable) still use `window.confirm()`, matching legacy
  behavior. A nicer in-app confirmation component is a reasonable future polish item, not a
  functional gap.

**Known gaps / follow-ups**
- The header's profile button (`AppHeader`) opens a `"userPanel"` modal key with no
  consumer yet — `UserPanel` (profile editing) hasn't been ported. Clicking it currently
  does nothing visible; this is expected until that feature lands.
- `JoinByCodeForm`'s "needs member selection" outcome just shows a text hint
  ("Elige tu integrante de equipo para continuar.") — the actual picker is `JoinTeamModal`,
  which reads the same `pendingJoin` state, so this resolves itself once the modal renders.
