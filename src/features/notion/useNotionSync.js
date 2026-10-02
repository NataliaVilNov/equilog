import { useState } from "react";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { createNotionClient } from "./notionClient.js";
import { buildHealthPage, buildPlanPage } from "./notionSchema.js";
import { describeSyncResult, syncToNotion } from "./notionSync.js";
import { getNotionToken } from "./notionStorage.js";
import { loadNotionConfig, loadNotionLinks, removeNotionLink, saveNotionLink } from "./notionStore.js";

// What one "Enviar a Notion" press covers. `from`/`to` bound dates (inclusive, YYYY-MM-DD);
// `hid` limits it to one horse; `plans` includes the weekly-board cells in that range.
//   week of the board  → { from: monday, to: sunday, plans: true }
//   a horse's Salud tab → { hid, from: "", to: "9999-12-31", plans: false }
const inRange = (d, from, to) => !!d && d >= from && d <= to;

// Runs a sync for `scope` and reports progress. Returns { status, message, run } where `run`
// resolves to "needs-setup" (no token on this device or no database yet — the caller opens the
// settings sheet) or a result summary string.
export function useNotionSync() {
  const { stableId, horses, health, weeklyPlans, boardConfig } = useStableData();
  const { uid } = usePermissions();
  const [progress, setProgress] = useState(null); // { done, total } | null

  async function run(scope) {
    const token = getNotionToken(uid);
    const config = token ? await loadNotionConfig(stableId) : null;
    if (!token || !config || !config.dataSourceId) return { needsSetup: true };

    const horseById = new Map(horses.map((h) => [h.id, h]));
    const inScopeHorse = (hid) => !scope.hid || scope.hid === hid;
    const vetIds = new Set(weeklyPlans.map((p) => p.vetHealthId).filter(Boolean));

    const items = [];
    health.forEach((record) => {
      const horse = horseById.get(record.hid);
      if (!horse || !inScopeHorse(record.hid) || !inRange(record.date, scope.from, scope.to)) return;
      items.push(buildHealthPage({ record, horse, isVet: vetIds.has(record.id) }));
    });
    if (scope.plans) {
      weeklyPlans.forEach((plan) => {
        const horse = horseById.get(plan.hid);
        if (!horse || !inScopeHorse(plan.hid) || !inRange(plan.date, scope.from, scope.to)) return;
        const page = buildPlanPage({ plan, horse, activities: boardConfig.activities });
        if (page) items.push(page);
      });
    }

    const links = await loadNotionLinks(stableId);
    const client = createNotionClient({ token });
    setProgress({ done: 0, total: items.length });
    try {
      const result = await syncToNotion({
        client,
        dataSourceId: config.dataSourceId,
        items,
        links,
        // Only erased weekly-board cells are archived. A deleted health record keeps its Notion
        // page: the health list may be incomplete while loading, and archiving on a partial
        // list would wipe pages that still exist. Same reason for the horses.length guard.
        inScope: (link) => scope.plans && horses.length > 0 && link.kind === "plan" && inScopeHorse(link.hid) && inRange(link.date, scope.from, scope.to),
        saveLink: (key, link) => saveNotionLink(stableId, key, link),
        removeLink: (key) => removeNotionLink(stableId, key),
        onProgress: setProgress,
      });
      return { message: describeSyncResult(result), failed: !!result.aborted || result.errors.length > 0 };
    } finally {
      setProgress(null);
    }
  }

  return { run, progress };
}
