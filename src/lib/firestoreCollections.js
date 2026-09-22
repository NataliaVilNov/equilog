import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseClient.js";
import { cleanForFirestore } from "./cleanForFirestore.js";

const BATCH_LIMIT = 500;

export function stableCollection(stableId, ...pathSegments) {
  return collection(db, "stables", stableId, ...pathSegments);
}

export function stableDoc(stableId, ...pathSegments) {
  return doc(db, "stables", stableId, ...pathSegments);
}

export async function writeDoc(ref, data) {
  await setDoc(ref, cleanForFirestore(data));
}

export async function patchDoc(ref, partial) {
  await updateDoc(ref, cleanForFirestore(partial));
}

export async function deleteDocRef(ref) {
  await deleteDoc(ref);
}

export function subscribeToCollection(ref, onChange) {
  return onSnapshot(ref, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Firestore collectionGroup queries can't filter by ancestor path segments, so every doc in
// a group-queried subcollection carries an explicit stableId field to filter on instead.
export function subscribeToCollectionGroup(collectionId, stableId, onChange) {
  const q = query(collectionGroup(db, collectionId), where("stableId", "==", stableId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function batchDeleteQuery(queryRef) {
  const snap = await getDocs(queryRef);
  const refs = snap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}
