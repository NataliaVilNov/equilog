// A standalone Firebase client for the React app.
//
// src/firebase.js is intentionally not reused here: it's dynamically imported by
// src/main.js only after the legacy app (public/legacy-app.js) has defined its globals,
// and its top-level onAuthStateChanged callback calls those legacy globals directly
// (window._fbShowAuth, window._fbSwitchStable, etc). Importing it from React code would
// throw as soon as auth state changes, since react-app.html never loads the legacy script.
// This module and src/firebase.js read the same env vars and point at the same Firebase
// project, so both apps operate on the same data.
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
