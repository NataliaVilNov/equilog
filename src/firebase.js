
// ============================================================
// FIREBASE CONFIG — sustituye con tus valores de Firebase Console
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Expose globals for the rest of the app (non-module scripts)
window._FB = { auth, db, storage, storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, arrayUnion, arrayRemove, deleteField };

// Auth state listener — arranges the app
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window._FBUSER = user;
    await window._fbLoadUserProfile(user);
    // If user has a lastStable, load it; else show stable selector
    const profile = window._FBPROFILE || {};
    if (profile.lastStable) {
      await window._fbSwitchStable(profile.lastStable);
    } else {
      window._fbShowStableSelector();
    }
  } else {
    window._FBUSER = null;
    window._fbShowAuth();
  }
});
