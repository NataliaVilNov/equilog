import { isFatalNotionError, NotionError } from "./notionClient.js";

// The sync loop: push a set of built pages (notionSchema.js) to Notion and keep a "link" per
// page — { pageId, hash, date, kind, hid } stored in Firestore by the caller — so running it
// again updates instead of duplicating. It knows nothing about React or Firestore: the client
// and the link store are passed in, which is also what makes it testable with fakes.
//
//   items       built pages for everything currently in scope
//   links       Map<key, link> of what was already sent
//   inScope     (link) => boolean — which existing links this run is responsible for; a link in
//               scope with no matching item means the record is gone (cell erased, record
//               deleted) and its Notion page is archived (never hard-deleted)
//   saveLink / removeLink   persistence of links; saveLink runs only AFTER the page exists, so a
//               failed run can never leave a page without a link except by dying in between,
//               which the "EquiLog ID" lookup below repairs on the next run
//
// Returns { created, updated, skipped, archived, errors, aborted }. A 401/403/404 stops the run
// (the next item would fail the same way) and is reported as `aborted`; any other failure is
// recorded against its item and the run continues.
export async function syncToNotion({ client, dataSourceId, items, links, inScope, saveLink, removeLink, onProgress }) {
  const result = { created: 0, updated: 0, skipped: 0, archived: 0, errors: [], aborted: null };
  const keys = new Set(items.map((i) => i.key));
  const stale = [...links.entries()].filter(([key, link]) => !keys.has(key) && inScope(link));
  const total = items.length + stale.length;
  let done = 0;
  const tick = () => onProgress && onProgress({ done: ++done, total });

  async function createOrAdopt(item) {
    const orphan = await client.findPageByEquilogId(dataSourceId, item.key);
    if (orphan) {
      await client.updatePage(orphan, { properties: item.properties });
      return { pageId: orphan, created: false };
    }
    return { pageId: await client.createPage(dataSourceId, item.properties), created: true };
  }

  for (const item of items) {
    try {
      const link = links.get(item.key);
      if (link && link.hash === item.hash) {
        result.skipped++;
      } else {
        let pageId;
        let created = false;
        if (link) {
          try {
            await client.updatePage(link.pageId, { properties: item.properties });
            pageId = link.pageId;
          } catch (err) {
            // The page was deleted/archived in Notion by hand: make a fresh one.
            const gone = err instanceof NotionError && (err.status === 404 || /archived|trash/i.test(err.message));
            if (!gone) throw err;
            ({ pageId, created } = await createOrAdopt(item));
          }
        } else {
          ({ pageId, created } = await createOrAdopt(item));
        }
        await saveLink(item.key, { pageId, hash: item.hash, date: item.date, kind: item.kind, hid: item.hid });
        if (created) result.created++;
        else result.updated++;
      }
    } catch (err) {
      result.errors.push({ key: item.key, message: err.message });
      if (isFatalNotionError(err)) {
        result.aborted = err.message;
        return result;
      }
    }
    tick();
  }

  for (const [key, link] of stale) {
    try {
      await client.updatePage(link.pageId, { archived: true });
      await removeLink(key);
      result.archived++;
    } catch (err) {
      // Already gone from Notion is the outcome we wanted anyway.
      if (err instanceof NotionError && err.status === 404) {
        await removeLink(key);
        result.archived++;
      } else {
        result.errors.push({ key, message: err.message });
        if (isFatalNotionError(err)) {
          result.aborted = err.message;
          return result;
        }
      }
    }
    tick();
  }

  return result;
}

// One-line Spanish summary for the toast / button, e.g. "3 enviados · 2 sin cambios".
export function describeSyncResult(r) {
  if (r.aborted) return r.aborted;
  const parts = [];
  const sent = r.created + r.updated;
  if (sent) parts.push(`${sent} enviado${sent === 1 ? "" : "s"}`);
  if (r.archived) parts.push(`${r.archived} archivado${r.archived === 1 ? "" : "s"}`);
  if (r.skipped) parts.push(`${r.skipped} sin cambios`);
  if (r.errors.length) parts.push(`${r.errors.length} con error`);
  return parts.length ? parts.join(" · ") : "Nada que enviar";
}
