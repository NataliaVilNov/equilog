import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseClient.js";

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
