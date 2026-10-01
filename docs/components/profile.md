# Profile & More panel

## Overview

Two small overlay panels reachable from anywhere in the app: the **More panel** (bottom
nav's "Más" / Home's "Más opciones") is a navigation hub to features that don't have a
dedicated bottom-nav slot — Boards, Cuadra, Alerts, Stats, the user's own profile, and
switching stables. The **User panel** (header's 👤 button, or "Mi perfil" from the More
panel) is the account-level "who am I" surface: edit your display name/phone/bio/photo, see
today's tasks assigned to you, and log out. Ported from `index.html:120-145` and
`public/legacy-app.js`'s `openMorePanel`/`openUserPanel`/`saveUserProfile`/
`previewUserProfilePhoto`/`removeUserProfilePhoto`/`renderMyDayTasks` (all removed from the
repo by the Phase 8c cutover — see git history at commit `8e74027~1` for the original source).

**Why this doc exists outside the normal phase numbering**: `docs/REFACTOR_PLAN.md` §2
sketched a `features/profile/` folder in the target architecture, but §4's phase table never
actually assigned it to a phase — it fell through the cracks for the entire migration. Both
panels' trigger buttons (`AppHeader`'s 👤, `BottomNav`'s "Más", `HomePage`'s "Más opciones")
existed and called `openModal(...)` from Phase 1/4 onward, but nothing consumed those modal
keys until this pass, discovered during a live QA session — see also the auth-flow fixes in
`docs/components/auth.md`/`stables.md` found the same way.

## Implementation

**Component tree**
```
src/features/home/
  MorePanel.jsx      — consumes the "morePanel" modal key
src/features/profile/
  UserPanel.jsx        — consumes the "userPanel" modal key
src/lib/imageResize.js  — resizeProfileImageFile(), pure canvas-based downscale/recompress
```

**State & data**
- `MorePanel` reads `usePermissions().can()` to conditionally show "Cuadra" (`can('stable')`)
  and "Estadísticas" (`can('stats')`), matching `openMorePanel`'s own `canPerm(...)` guards.
  Every item either `navigate()`s (closing the panel first) or opens another modal key
  (`userPanel`, `stablePanel`).
- `UserPanel` reads `AuthContext` (`user`, `profile`) and holds the edit form (name/phone/
  bio/photo) as local component state, seeded from `profile` on mount. Saving calls
  `authActions.updateUserProfile(user, profile, {...})`, which updates the Firebase Auth
  `displayName` and merges the same shape into the `users/{uid}` Firestore doc legacy wrote
  to, then hands the merged result to `AuthContext.applyProfileUpdate` so the header/panel
  reflect the change immediately — `AuthContext` only loads `profile` once (on auth state
  change), so nothing else refreshes it after a manual save.
- A "Personalizar inicio" card (between the profile-edit form and "Mi agenda de hoy") lets
  the user pick their post-login landing tab and which Home quick-action shortcuts show.
  Reads `src/features/home/landingDestinations.js`'s `LANDING_DESTINATIONS` (a fixed,
  non-arbitrary list of routes — `isAvailable(ctx)` filters out ones the user can't currently
  reach, e.g. "Equipo" without the `team` permission) and `src/features/home/
  homeShortcuts.js`'s `QUICK_ACTION_CATALOG` (minus the always-on "Más opciones" item, which
  isn't user-hideable — it's the one guaranteed way into profile/logout/stable-switching).
  Saving calls `authActions.updateHomePreferences(user, profile, {landingRoute,
  quickActions})`, which merges `landingRoute`/`quickActions` into the same `users/{uid}` doc
  the profile form writes to, independently of it (its own save button/state). `HomePage`
  reads these back through `visibleQuickActions()`; `StableListScreen`'s "a stable just
  became active" effect and `GuestRoute` read `landingRoute` through
  `resolveLandingRoute()` to decide where a fresh session lands — see
  `docs/components/home.md` and `docs/components/boards.md`.
- The "Mi agenda de hoy" section filters `useStableData().tasks` to today's date and
  `usePermissions().myTeamMember.id` — a simplification of legacy's `renderMyDayTasks`, which
  matched by `task.uid === user.uid` OR a case-insensitive name match against `D.team`;
  `t.uid` is never actually set anywhere in this app's data model (dead field), and the
  `myTeamMember` lookup this reuses is the same uid-based match every other page in this
  migration already uses (`DayBoardPage`, `HomePage`, etc.) — one consistent lookup instead
  of two different ones.
- Photo upload uses `resizeProfileImageFile` (canvas downscale to ≤160px, JPEG recompression
  with a shrink-further fallback if still >70KB, and a hard reject if still >95KB after that)
  — ported verbatim from legacy. This is **not** the same pattern used for horse/team photos
  elsewhere in this app (plain `FileReader.readAsDataURL`, no resize) — profile photos live
  inline in the small `users/{uid}` doc rather than a stable's `data/main` doc, and legacy's
  own comment on this function explains the aggressive downscaling is specifically to avoid
  Firestore write-size problems on that doc.
- Logout has no explicit navigation call — `ProtectedRoute` reacts to `AuthContext.user`
  becoming null and redirects on its own, same reactive-routing principle as the login fix.

**Routing**
- Neither panel owns a route — both are `ModalContext`-keyed overlays mounted globally in
  `App.jsx` (`isModalOpen("morePanel")` / `isModalOpen("userPanel")`), alongside the existing
  `StablePanel`/`JoinTeamModal`.

**Permissions**
- `MorePanel`'s Cuadra/Estadísticas items are permission-gated as described above. The panel
  itself has no gate — every signed-in user can open it, matching legacy.
- `UserPanel` has no permission gate — it's the user's own account, not stable data.

**Notable decisions / deviations from the legacy behavior**
- The "sync my name into the active stable's `members.{uid}.name` map" best-effort side
  write legacy's `saveUserProfile` attempts after saving is **not** ported — it was already
  non-blocking/silently-swallowed in legacy (wrapped in its own empty `catch`, never
  surfaced to the user), and `StableSelectionContext` already refreshes `activeStable` from
  its own mutators. Out of scope for what this fix needed to unblock.
- `MorePanel`'s "Pizarras" item now always passes `?tab=weekly` explicitly (matching the
  `fix: default home's boards quick action to the weekly tab` fix from Phase 6), rather than
  relying on `BoardsPage`'s own default.

**Known gaps / follow-ups**
- None beyond what's already tracked in `docs/BACKLOG.md`.
