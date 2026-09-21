# Auth

## Overview

Email/password login and registration. This is the entry gate for the whole app: until a
user is signed in, every other route redirects to `/login`. Ported from the legacy
`#auth-screen` (`index.html:16-42`) and its handlers (`public/legacy-app.js:13-63`).

## Implementation

**Component tree**
```
src/features/auth/
  AuthScreen.jsx      — tab switcher (Entrar / Registrarse), the /login route's element
  LoginForm.jsx        — email + password, calls authActions.login()
  RegisterForm.jsx     — name + email + password, calls authActions.register()
  authActions.js        — login(), register(), logout() — thin wrappers over firebase/auth
  authErrorMessage.js    — Firebase auth error code -> Spanish message map
src/contexts/AuthContext.jsx  — AuthProvider, wraps onAuthStateChanged
src/lib/firebaseClient.js      — standalone Firebase app instance for the React app
```

**State & data**
- `AuthContext` wraps `onAuthStateChanged` (from `src/lib/firebaseClient.js`'s `auth`) and
  exposes `{ user, profile, loading }`. On every auth-state change it loads the user's
  profile doc from `users/{uid}` (falling back to `{name, email, stables: []}` if the doc
  doesn't exist yet), mirroring `window._fbLoadUserProfile`
  (`public/legacy-app.js:111-119`).
- `LoginForm`/`RegisterForm` hold their own local form state (email/password/name/error) and
  call `authActions.login`/`authActions.register` directly — they don't go through
  `StableDataContext`, since auth is orthogonal to any particular stable's data.
- `authActions.register` also writes the initial `users/{uid}` profile doc
  (`{name, email, role: 'admin', created, stables: []}`), matching `doRegister`
  (`public/legacy-app.js:34-51`).

**Routing**
- `AuthScreen` is mounted at `/login` (`src/routes/routes.jsx`).
- `ProtectedRoute` (`src/routes/ProtectedRoute.jsx`) redirects to `/login` whenever
  `AuthContext`'s `user` is null.

**Permissions**
None — authentication is a prerequisite for every permission check, not gated by one.

**Notable decisions / deviations from the legacy behavior**
- The legacy `authTab()` toggled inline styles on DOM elements directly
  (`public/legacy-app.js:17-22`). `AuthScreen` instead holds `tab` in React state and picks
  between two style objects — same visual result, no direct DOM manipulation.
- `authErrorMessage.js` ports `fbErrMsg` verbatim for Firebase error codes, and additionally
  handles a plain `Error` with no `.code` (used for the client-side "name is required"
  validation in `RegisterForm`), which legacy handled as a separate inline branch in
  `doRegister`.
- The React app does **not** import `src/firebase.js` — it has legacy-only side effects (see
  `src/lib/firebaseClient.js`'s file comment) — and instead initializes its own Firebase app
  instance pointed at the same project via the same env vars.

**Known gaps / follow-ups**
- `authActions.logout()` ports `doLogout`, but the only place it's currently wired up is
  `StableListScreen`'s "Salir" button (see `docs/components/stables.md`) — there's no
  logout entry point from inside an active stable yet, because `UserPanel` (profile editing,
  where legacy puts its logout button) hasn't been ported.
- No "forgot password" flow — matches the legacy app, which doesn't have one either.
