import { getDoc, getDocs } from "firebase/firestore";
import { stableCollection, stableDoc, writeDoc, deleteDocRef } from "../../lib/firestoreCollections.js";

// Non-secret Notion state kept in Firestore per stable (the token never is — see
// notionStorage.js):
//   stables/{sid}/integrations/notion   { databaseId, dataSourceId, databaseUrl, parentPageId, createdBy, createdAt }
//   stables/{sid}/notionLinks/{key}      { pageId, hash, kind, hid, date, syncedAt }
// Both are read once on demand rather than through a live listener, so a stable that never
// uses Notion costs no listener (and no error toast if the rules aren't published yet).
const configRef = (stableId) => stableDoc(stableId, "integrations", "notion");

export async function loadNotionConfig(stableId) {
  const snap = await getDoc(configRef(stableId));
  return snap.exists() ? snap.data() : null;
}

export function saveNotionConfig(stableId, config) {
  return writeDoc(configRef(stableId), { ...config, stableId });
}

export async function loadNotionLinks(stableId) {
  const snap = await getDocs(stableCollection(stableId, "notionLinks"));
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

export function saveNotionLink(stableId, key, link) {
  return writeDoc(stableDoc(stableId, "notionLinks", key), { ...link, stableId, syncedAt: new Date().toISOString() });
}

export function removeNotionLink(stableId, key) {
  return deleteDocRef(stableDoc(stableId, "notionLinks", key));
}
