import { describe, expect, it, vi } from "vitest";
import { createNotionClient, NotionError } from "./notionClient.js";
import { buildHealthPage, buildPlanPage, hashProperties, parseNotionPageId, planKey } from "./notionSchema.js";
import { describeSyncResult, syncToNotion } from "./notionSync.js";

const horse = { id: "h1", name: "Basilea" };
const activities = [
  { id: "monta", code: "M", label: "Montar", tone: "green" },
  { id: "vet", code: "VET", label: "Veterinario", tone: "red" },
];

describe("buildHealthPage", () => {
  const record = { id: "r1", hid: "h1", type: "vacuna", label: "Gripe", date: "2026-10-02", nxt: "2027-04-02", notes: "Sin reacción", amount: 35, payStatus: "pagado" };

  it("maps a health record onto the database properties", () => {
    const page = buildHealthPage({ record, horse });
    expect(page).toMatchObject({ key: "health__r1", kind: "health", hid: "h1", date: "2026-10-02" });
    expect(page.properties.Registro.title[0].text.content).toBe("Basilea · Gripe");
    expect(page.properties.Tipo).toEqual({ select: { name: "Vacuna" } });
    expect(page.properties["Próxima revisión"]).toEqual({ date: { start: "2027-04-02" } });
    expect(page.properties.Importe).toEqual({ number: 35 });
    expect(page.properties.Pago).toEqual({ select: { name: "Pagado" } });
    expect(page.properties["EquiLog ID"].rich_text[0].text.content).toBe("health__r1");
  });

  it("marks a board-linked record as Veterinario and leaves cost fields empty at 0", () => {
    const page = buildHealthPage({ record: { ...record, type: "otro", amount: 0, nxt: null }, horse, isVet: true });
    expect(page.properties.Tipo).toEqual({ select: { name: "Veterinario" } });
    expect(page.properties.Importe).toEqual({ number: null });
    expect(page.properties.Pago).toEqual({ select: null });
    expect(page.properties["Próxima revisión"]).toEqual({ date: null });
  });

  it("keeps select names comma-free and rich text under Notion's 2000-character limit", () => {
    const page = buildHealthPage({ record: { ...record, notes: "x".repeat(5000) }, horse: { id: "h", name: "Luna, la Grande" } });
    expect(page.properties.Caballo.select.name).toBe("Luna  la Grande");
    expect(page.properties["Informe / notas"].rich_text[0].text.content).toHaveLength(2000);
  });
});

describe("buildPlanPage", () => {
  it("builds one page per horse and day with activities and done items", () => {
    const page = buildPlanPage({ plan: { hid: "h1", date: "2026-10-02", activities: ["monta", "vet"], completed: ["monta"], note: "Cojera leve" }, horse, activities });
    expect(page.key).toBe(planKey("h1", "2026-10-02"));
    expect(page.properties.Actividades).toEqual({ multi_select: [{ name: "Montar" }, { name: "Veterinario" }] });
    expect(page.properties["Informe / notas"].rich_text[0].text.content).toBe("Cojera leve\nHecho: Montar");
    expect(page.properties.Tipo).toEqual({ select: { name: "Plan semanal" } });
  });

  it("returns null for an empty cell", () => {
    expect(buildPlanPage({ plan: { hid: "h1", date: "2026-10-02", activities: [], completed: [], note: "" }, horse, activities })).toBeNull();
  });
});

describe("hashProperties", () => {
  it("is stable across key order and changes with content", () => {
    expect(hashProperties({ a: 1, b: { c: 2, d: 3 } })).toBe(hashProperties({ b: { d: 3, c: 2 }, a: 1 }));
    expect(hashProperties({ a: 1 })).not.toBe(hashProperties({ a: 2 }));
  });
});

describe("parseNotionPageId", () => {
  const dashed = "1429989f-e8ac-4eff-bc8f-57f56486db54";
  it("reads the id from page links, bare ids and dashed ids", () => {
    expect(parseNotionPageId("https://www.notion.so/workspace/Mi-Pagina-1429989fe8ac4effbc8f57f56486db54?pvs=4")).toBe(dashed);
    expect(parseNotionPageId("https://www.notion.so/1429989fe8ac4effbc8f57f56486db54")).toBe(dashed);
    expect(parseNotionPageId("1429989fe8ac4effbc8f57f56486db54")).toBe(dashed);
    expect(parseNotionPageId(dashed.toUpperCase())).toBe(dashed);
  });
  it("returns null when there is no id", () => {
    expect(parseNotionPageId("")).toBeNull();
    expect(parseNotionPageId("https://www.notion.so/Mi-Pagina")).toBeNull();
  });
});

describe("createNotionClient", () => {
  const response = (status, body, headers = {}) => ({ ok: status < 300, status, json: async () => body, headers: { get: (k) => headers[k] ?? null } });
  const make = (fetchImpl, extra = {}) => createNotionClient({ token: "secret", fetchImpl, sleep: async () => {}, minIntervalMs: 0, ...extra });

  it("sends the token and version headers", async () => {
    const fetchImpl = vi.fn(async () => response(200, { id: "u" }));
    await make(fetchImpl).getMe();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/users/me");
    expect(init.headers.Authorization).toBe("Bearer secret");
    expect(init.headers["Notion-Version"]).toBe("2025-09-03");
  });

  it("waits Retry-After and retries on 429", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(429, {}, { "Retry-After": "2" })).mockResolvedValueOnce(response(200, { id: "p" }));
    await expect(make(fetchImpl, { sleep }).getPage("p")).resolves.toEqual({ id: "p" });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("does not retry a page-creating POST on a 5xx, but does retry a PATCH", async () => {
    const post = vi.fn(async () => response(502, { message: "bad gateway" }));
    await expect(make(post).createPage("ds", {})).rejects.toMatchObject({ status: 502 });
    expect(post).toHaveBeenCalledTimes(1);

    const patch = vi.fn().mockResolvedValueOnce(response(503, {})).mockResolvedValueOnce(response(200, { id: "p" }));
    await expect(make(patch).updatePage("p", { properties: {} })).resolves.toEqual({ id: "p" });
    expect(patch).toHaveBeenCalledTimes(2);
  });

  it("explains 401/403/404 in Spanish and a network failure", async () => {
    const err = await make(async () => response(401, {})).getMe().catch((e) => e);
    expect(err).toBeInstanceOf(NotionError);
    expect(err.message).toMatch(/token/i);
    await expect(make(async () => response(403, {})).getMe()).rejects.toThrow(/comparte/i);
    await expect(make(async () => { throw new TypeError("Failed to fetch"); }).getMe()).rejects.toThrow(/No se pudo conectar/);
  });

  it("creates the database and reads the data source id from the response", async () => {
    const fetchImpl = vi.fn(async () => response(200, { id: "db1", url: "https://notion.so/db1", data_sources: [{ id: "ds1" }] }));
    await expect(make(fetchImpl).createDatabase({ parentPageId: "pg" })).resolves.toEqual({ databaseId: "db1", dataSourceId: "ds1", url: "https://notion.so/db1" });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.parent).toEqual({ type: "page_id", page_id: "pg" });
    expect(Object.keys(body.initial_data_source.properties)).toContain("EquiLog ID");
  });
});

describe("syncToNotion", () => {
  const item = (key, hash = "h1", extra = {}) => ({ key, kind: "health", hid: "h1", date: "2026-10-02", properties: { k: key }, hash, ...extra });
  const setup = (overrides = {}) => {
    const stored = new Map();
    const removed = [];
    const client = { findPageByEquilogId: vi.fn(async () => null), createPage: vi.fn(async () => "page-new"), updatePage: vi.fn(async () => ({})), ...overrides.client };
    const run = (items, links = new Map(), inScope = () => false) =>
      syncToNotion({ client, dataSourceId: "ds", items, links, inScope, saveLink: async (k, l) => stored.set(k, l), removeLink: async (k) => removed.push(k) });
    return { client, stored, removed, run };
  };

  it("creates new pages and stores a link per page", async () => {
    const { client, stored, run } = setup();
    const result = await run([item("a"), item("b")]);
    expect(result).toMatchObject({ created: 2, updated: 0, skipped: 0, errors: [], aborted: null });
    expect(client.createPage).toHaveBeenCalledTimes(2);
    expect(stored.get("a")).toEqual({ pageId: "page-new", hash: "h1", date: "2026-10-02", kind: "health", hid: "h1" });
  });

  it("skips unchanged items, patches changed ones", async () => {
    const { client, run } = setup();
    const links = new Map([["same", { pageId: "p1", hash: "h1" }], ["changed", { pageId: "p2", hash: "old" }]]);
    const result = await run([item("same"), item("changed", "new")], links);
    expect(result).toMatchObject({ skipped: 1, updated: 1, created: 0 });
    expect(client.updatePage).toHaveBeenCalledWith("p2", { properties: { k: "changed" } });
    expect(client.createPage).not.toHaveBeenCalled();
  });

  it("adopts an orphan page found by EquiLog ID instead of creating a duplicate", async () => {
    const { client, stored, run } = setup({ client: { findPageByEquilogId: vi.fn(async () => "orphan") } });
    const result = await run([item("a")]);
    expect(result).toMatchObject({ created: 0, updated: 1 });
    expect(client.createPage).not.toHaveBeenCalled();
    expect(stored.get("a").pageId).toBe("orphan");
  });

  it("recreates a page that was deleted in Notion", async () => {
    const { client, stored, run } = setup({ client: { updatePage: vi.fn(async () => { throw new NotionError("gone", { status: 404 }); }) } });
    const result = await run([item("a", "new")], new Map([["a", { pageId: "dead", hash: "old" }]]));
    expect(result.created).toBe(1);
    expect(client.createPage).toHaveBeenCalled();
    expect(stored.get("a").pageId).toBe("page-new");
  });

  it("stores the link only after the page exists", async () => {
    const { stored, run } = setup({ client: { createPage: vi.fn(async () => { throw new NotionError("boom", { status: 500 }); }) } });
    const result = await run([item("a")]);
    expect(result.errors).toHaveLength(1);
    expect(stored.size).toBe(0);
  });

  it("keeps going after an ordinary error but aborts on 401", async () => {
    const { client, run } = setup({
      client: { createPage: vi.fn().mockRejectedValueOnce(new NotionError("boom", { status: 500 })).mockResolvedValue("p") },
    });
    const result = await run([item("a"), item("b")]);
    expect(result).toMatchObject({ created: 1, aborted: null });
    expect(result.errors).toEqual([{ key: "a", message: "boom" }]);

    const bad = setup({ client: { createPage: vi.fn(async () => { throw new NotionError("token", { status: 401 }); }) } });
    const aborted = await bad.run([item("a"), item("b")]);
    expect(aborted.aborted).toBe("token");
    expect(bad.client.createPage).toHaveBeenCalledTimes(1);
  });

  it("archives pages whose record is gone, only inside the scope", async () => {
    const { client, removed, run } = setup();
    const links = new Map([
      ["plan__h1__2026-10-02", { pageId: "p1", hash: "x", kind: "plan", date: "2026-10-02" }],
      ["plan__h1__2026-11-02", { pageId: "p2", hash: "x", kind: "plan", date: "2026-11-02" }],
    ]);
    const result = await run([], links, (l) => l.date <= "2026-10-31");
    expect(result.archived).toBe(1);
    expect(client.updatePage).toHaveBeenCalledWith("p1", { archived: true });
    expect(removed).toEqual(["plan__h1__2026-10-02"]);
  });

  it("reports progress and summarises in Spanish", async () => {
    const onProgress = vi.fn();
    const result = await syncToNotion({
      client: { findPageByEquilogId: async () => null, createPage: async () => "p", updatePage: async () => ({}) },
      dataSourceId: "ds", items: [item("a"), item("b")], links: new Map(), inScope: () => false, saveLink: async () => {}, removeLink: async () => {}, onProgress,
    });
    expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 2 });
    expect(describeSyncResult(result)).toBe("2 enviados");
    expect(describeSyncResult({ created: 0, updated: 0, skipped: 3, archived: 1, errors: [{}], aborted: null })).toBe("1 archivado · 3 sin cambios · 1 con error");
    expect(describeSyncResult({ created: 0, updated: 0, skipped: 0, archived: 0, errors: [], aborted: null })).toBe("Nada que enviar");
  });
});
