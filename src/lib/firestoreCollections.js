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
import { reportWriteError } from "./errorReporter.js";

const BATCH_LIMIT = 500;

export function stableCollection(stableId, ...pathSegments) {
  return collection(db, "stables", stableId, ...pathSegments);
}

export function stableDoc(stableId, ...pathSegments) {
  return doc(db, "stables", stableId, ...pathSegments);
}

export async function writeDoc(ref, data) {
  try {
    await setDoc(ref, cleanForFirestore(data));
  } catch (err) {
    reportWriteError(err);
    throw err;
  }
}

export async function patchDoc(ref, partial) {
  try {
    await updateDoc(ref, cleanForFirestore(partial));
  } catch (err) {
    reportWriteError(err);
    throw err;
  }
}

export async function deleteDocRef(ref) {
  try {
    await deleteDoc(ref);
  } catch (err) {
    reportWriteError(err);
    throw err;
  }
}

// Every mutator that batches several writes together (a health record + its linked expense,
// a settlement + the expenses it settles, a template application, ...) commits through this
// instead of calling batch.commit() directly, so a failure reports the same way a single
// writeDoc/patchDoc/deleteDocRef failure does, in exactly one place.
export async function commitBatch(batch) {
  try {
    await batch.commit();
  } catch (err) {
    reportWriteError(err);
    throw err;
  }
}

// onSnapshot's error callback is optional and easy to forget — without one, a listener that
// fails (e.g. a security-rules rejection on read) just stops silently, with nothing visibly
// wrong except data that never arrives. Every subscribe helper below reports through the same
// path as the write helpers.
function reportedOnSnapshot(ref, onNext) {
  return onSnapshot(ref, onNext, (err) => reportWriteError(err));
}

export function subscribeToCollection(ref, onChange) {
  return reportedOnSnapshot(ref, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToDoc(ref, onChange) {
  return reportedOnSnapshot(ref, (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  });
}

// Firestore collectionGroup queries can't filter by ancestor path segments, so every doc in
// a group-queried subcollection carries an explicit stableId field to filter on instead.
export function subscribeToCollectionGroup(collectionId, stableId, onChange) {
  const q = query(collectionGroup(db, collectionId), where("stableId", "==", stableId));
  return reportedOnSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function batchDeleteQuery(queryRef) {
  try {
    const snap = await getDocs(queryRef);
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
      await batch.commit();
    }
  } catch (err) {
    reportWriteError(err);
    throw err;
  }
}
