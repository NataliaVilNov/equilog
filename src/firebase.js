
// ============================================================
// FIREBASE CONFIG — sustituye con tus valores de Firebase Console
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCf1ljX8ow5y2R9L1WhEH4_ifpqbl09d5U",
  authDomain: "equilog-f0e57.firebaseapp.com",
  projectId: "equilog-f0e57",
  storageBucket: "equilog-f0e57.firebasestorage.app",
  messagingSenderId: "255037268401",
  appId: "1:255037268401:web:41e0dc8863448c9a6e9d90"
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
