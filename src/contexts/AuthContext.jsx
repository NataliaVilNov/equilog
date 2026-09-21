import { createContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebaseClient.js";

export const AuthContext = createContext(null);

// Ports the profile-loading fallback of window._fbLoadUserProfile
// (public/legacy-app.js:111-119).
async function loadProfile(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) return snap.data();
  } catch (_e) {
    // fall through to the default below
  }
  return { name: user.displayName || "", email: user.email, stables: [] };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        setProfile(await loadProfile(nextUser));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
