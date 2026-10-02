import { databaseProperties } from "./notionSchema.js";

// Thin Notion REST client for the browser. Notion's API currently answers browser (CORS)
// requests — observed behaviour, not documented — so EquiLog calls it directly with the user's
// own integration token (see notionStorage.js). `baseUrl` is the one place to repoint at a
// serverless proxy if Notion ever stops allowing that.
export const NOTION_API = "https://api.notion.com/v1";
// 2025-09-03 is the data-sources API version (pages are created under a data_source_id).
export const NOTION_VERSION = "2025-09-03";

export class NotionError extends Error {
  constructor(message, { status = 0, retryAfter = 0 } = {}) {
    super(message);
    this.name = "NotionError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// Failures that mean "stop the whole sync": retrying the next item would fail the same way.
export const isFatalNotionError = (err) => err instanceof NotionError && [401, 403, 404].includes(err.status);

function describeError(status, data) {
  const detail = data && typeof data.message === "string" ? data.message : "";
  if (status === 401) return "El token de Notion no es válido o ha sido revocado.";
  if (status === 403) return "La integración no tiene permiso: comparte la página o la base de datos con ella en Notion.";
  if (status === 404) return "Notion no encuentra la página o base de datos (¿borrada o no compartida con la integración?).";
  if (status === 429) return "Notion está limitando las peticiones; inténtalo de nuevo en un momento.";
  return detail ? `Notion: ${detail}` : `Notion respondió con el error ${status}.`;
}

// `sleep`, `clock` and `fetchImpl` are injectable so the retry/throttle logic is testable.
export function createNotionClient({
  token,
  baseUrl = NOTION_API,
  fetchImpl = (...args) => globalThis.fetch(...args),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  clock = () => Date.now(),
  minIntervalMs = 350, // ~3 requests/second, the limit on Notion's non-Business plans
  maxRetries = 3,
} = {}) {
  let lastRequestAt = 0;

  async function throttle() {
    const wait = lastRequestAt + minIntervalMs - clock();
    if (wait > 0) await sleep(wait);
    lastRequestAt = clock();
  }

  // `safeToRetry` marks POSTs that are really reads (queries) — a plain POST that creates
  // something is never retried on a 5xx, since the first attempt may have succeeded.
  async function request(method, path, body, { safeToRetry = method !== "POST" } = {}) {
    for (let attempt = 0; ; attempt++) {
      await throttle();
      let res;
      try {
        res = await fetchImpl(baseUrl + path, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (_err) {
        throw new NotionError("No se pudo conectar con Notion (¿sin conexión o bloqueado por el navegador?).");
      }
      let data = null;
      try {
        data = await res.json();
      } catch (_err) {
        // empty or non-JSON body
      }
      if (res.ok) return data;

      const retryAfter = Number(res.headers && res.headers.get && res.headers.get("Retry-After")) || 1;
      if (res.status === 429 && attempt < maxRetries) {
        await sleep(retryAfter * 1000);
        continue;
      }
      if (res.status >= 500 && safeToRetry && attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new NotionError(describeError(res.status, data), { status: res.status, retryAfter });
    }
  }

  return {
    request,

    getMe: () => request("GET", "/users/me"),

    getPage: (pageId) => request("GET", `/pages/${pageId}`),

    // Creates the EquiLog database under a page the user shared with the integration and
    // returns the ids EquiLog needs to remember (neither is a secret).
    async createDatabase({ parentPageId, title = "EquiLog · Registros" }) {
      const created = await request("POST", "/databases", {
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: title } }],
        initial_data_source: { properties: databaseProperties() },
      });
      let dataSourceId = created.data_sources && created.data_sources[0] && created.data_sources[0].id;
      if (!dataSourceId) {
        const db = await request("GET", `/databases/${created.id}`);
        dataSourceId = db.data_sources && db.data_sources[0] && db.data_sources[0].id;
      }
      if (!dataSourceId) throw new NotionError("Notion creó la base de datos pero no devolvió su fuente de datos.");
      return { databaseId: created.id, dataSourceId, url: created.url || "" };
    },

    // An orphan page from a run that created it but died before EquiLog stored the link.
    async findPageByEquilogId(dataSourceId, key) {
      const res = await request(
        "POST",
        `/data_sources/${dataSourceId}/query`,
        { filter: { property: "EquiLog ID", rich_text: { equals: key } }, page_size: 1 },
        { safeToRetry: true }
      );
      return (res.results && res.results[0] && res.results[0].id) || null;
    },

    async createPage(dataSourceId, properties) {
      const page = await request("POST", "/pages", {
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        properties,
      });
      return page.id;
    },

    updatePage: (pageId, body) => request("PATCH", `/pages/${pageId}`, body),
  };
}
