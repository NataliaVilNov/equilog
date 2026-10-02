// The Notion integration token lives ONLY in this browser's localStorage, keyed by user. It is
// deliberately never written to Firestore (every member of a stable can read stable docs) and
// never part of the build (VITE_* values are public in the bundle). Every access is wrapped:
// localStorage can be unavailable (private windows, blocked site data) and the feature must
// then just behave as "not connected".
const tokenKey = (uid) => `equilog:notion-token:${uid}`;

export function getNotionToken(uid) {
  if (!uid) return "";
  try {
    return localStorage.getItem(tokenKey(uid)) || "";
  } catch (_err) {
    return "";
  }
}

// Returns false when the token could not be stored (the caller says so instead of pretending).
export function setNotionToken(uid, token) {
  if (!uid) return false;
  try {
    localStorage.setItem(tokenKey(uid), token);
    return true;
  } catch (_err) {
    return false;
  }
}

export function clearNotionToken(uid) {
  if (!uid) return;
  try {
    localStorage.removeItem(tokenKey(uid));
  } catch (_err) {
    // nothing stored, nothing to clear
  }
}
