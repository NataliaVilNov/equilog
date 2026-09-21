import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseClient.js";

function stableDataDocRef(stableId) {
  return doc(db, "stables", stableId, "data", "main");
}

export async function getStableDoc(stableId) {
  const snap = await getDoc(stableDataDocRef(stableId));
  return snap.exists() ? snap.data() : null;
}

export async function setStableDoc(stableId, data) {
  await setDoc(stableDataDocRef(stableId), data);
}

export function subscribeToStableDoc(stableId, onChange) {
  return onSnapshot(stableDataDocRef(stableId), (snap) => {
    if (snap.exists() && snap.metadata.hasPendingWrites === false) {
      onChange(snap.data());
    }
  });
}
