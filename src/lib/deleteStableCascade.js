import { collection, collectionGroup, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "./firebaseClient.js";
import { batchDeleteQuery } from "./firestoreCollections.js";

const STABLE_SUBCOLLECTIONS = [
  "horses",
  "team",
  "tasks",
  "stableExpenses",
  "sessionAlerts",
  "taskTemplates",
  "absences",
  "expenseSettlements",
  "weeklyPlans",
  "periodicBoardDates",
  "boardAssignments",
];

// Collections nested more than one level below stables/{id} — unreachable by deleting their
// parent docs, since Firestore never cascade-deletes subcollections — so they're cleaned via
// a collectionGroup query instead, scoped by the stableId field every such doc carries.
const NESTED_COLLECTION_GROUPS = ["trainings", "health", "healthDocs", "expenses", "occurrences"];

// Deleting a nonexistent/empty collection or document is a harmless no-op, so this stays
// correct as each collection referenced here lands in its own migration phase — only the
// trailing legacy `data/main` line needs to be dropped once that phase (11) removes it.
export async function deleteStableCascade(stableId) {
  for (const name of NESTED_COLLECTION_GROUPS) {
    await batchDeleteQuery(query(collectionGroup(db, name), where("stableId", "==", stableId)));
  }
  for (const name of STABLE_SUBCOLLECTIONS) {
    await batchDeleteQuery(collection(db, "stables", stableId, name));
  }
  await deleteDoc(doc(db, "stables", stableId, "boardConfig", "main"));
  await deleteDoc(doc(db, "stables", stableId, "data", "main"));
}
