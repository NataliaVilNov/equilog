import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseClient.js";
import { cleanForFirestore } from "../../lib/cleanForFirestore.js";

// Ports doLogin (public/legacy-app.js:24-32).
export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

// Ports doRegister (public/legacy-app.js:34-51).
export async function register(name, email, password) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio");
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: trimmedName });
  await setDoc(doc(db, "users", cred.user.uid), {
    name: trimmedName,
    email: email.trim(),
    role: "admin",
    created: serverTimestamp(),
    stables: [],
  });
}

// Ports doLogout (public/legacy-app.js:53-56).
export async function logout() {
  await signOut(auth);
}

// Ports saveUserProfile (public/legacy-app.js, deleted in the Phase 8c cutover — see git
// history at commit 8e74027~1). Returns the merged profile the caller should store locally.
// The "sync name into the active stable's members map" best-effort side write legacy does
// is left out here — it's non-blocking/best-effort in legacy too (wrapped in its own
// try/catch, never surfaced to the user), and StableSelectionContext already refreshes
// `activeStable` on its own switchStable/refreshStables calls.
export async function updateUserProfile(user, currentProfile, { name, phone, bio, photo }) {
  const trimmedName = (name || "").trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio");
  const payload = cleanForFirestore({
    name: trimmedName,
    email: user.email || "",
    phone: (phone || "").trim(),
    bio: (bio || "").trim(),
    photo: photo || "",
    updated: new Date().toISOString(),
  });
  await updateProfile(user, { displayName: trimmedName });
  try {
    await setDoc(doc(db, "users", user.uid), payload, { merge: true });
  } catch (photoErr) {
    if (payload.photo) {
      const fallback = { ...payload, photo: "" };
      await setDoc(doc(db, "users", user.uid), fallback, { merge: true });
      return { profile: { ...currentProfile, ...fallback }, photoDropped: true };
    }
    throw photoErr;
  }
  return { profile: { ...currentProfile, ...payload }, photoDropped: false };
}

// Writes just the home-personalization fields (landing tab + quick-action shortcut
// selection) — kept separate from updateUserProfile since these aren't identity fields (no
// auth displayName touch, no photo-fallback retry logic).
export async function updateHomePreferences(user, currentProfile, { landingRoute, quickActions }) {
  const payload = cleanForFirestore({
    landingRoute: landingRoute || null,
    quickActions: quickActions || null,
  });
  await setDoc(doc(db, "users", user.uid), payload, { merge: true });
  return { ...currentProfile, ...payload };
}
