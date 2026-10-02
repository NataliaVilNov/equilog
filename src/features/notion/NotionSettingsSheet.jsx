import { useEffect, useState } from "react";
import { SlideUpSheet } from "../../components/SlideUpSheet.jsx";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { createNotionClient } from "./notionClient.js";
import { parseNotionPageId } from "./notionSchema.js";
import { clearNotionToken, getNotionToken, setNotionToken } from "./notionStorage.js";
import { clearNotionLinks, loadNotionConfig, saveNotionConfig } from "./notionStore.js";

const steps = { fontSize: ".78rem", color: "var(--gr)", paddingLeft: "1.1rem", margin: "0 0 .8rem", lineHeight: 1.5 };

// Connects EquiLog to the user's Notion workspace. Two separate things are set up:
//  - per stable, by an admin, once: the Notion database (created by EquiLog under a page the
//    admin shared with their integration) — non-secret ids saved in Firestore;
//  - per person and device: the integration token, kept only in this browser (notionStorage.js).
export function NotionSettingsSheet({ onClose }) {
  const { stableId } = useStableData();
  const { isAdmin, uid } = usePermissions();
  const { showToast } = useToast();
  const [config, setConfig] = useState(undefined); // undefined = loading, null = none yet
  const [hasToken, setHasToken] = useState(() => !!getNotionToken(uid));
  const [token, setToken] = useState("");
  const [pageLink, setPageLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadNotionConfig(stableId)
      .then((c) => !cancelled && setConfig(c))
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
          setError("No he podido leer la configuración de Notion de esta cuadra.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stableId]);

  function storeToken(value) {
    if (!setNotionToken(uid, value)) {
      setError("Este navegador no permite guardar el token (¿ventana privada?).");
      return false;
    }
    setHasToken(true);
    setToken("");
    return true;
  }

  // Validates the token and page, creates the database and saves its ids. `recreate` reuses
  // the token already stored on this device (to replace a deleted/broken database).
  async function connect({ recreate = false } = {}) {
    setError("");
    const value = recreate ? getNotionToken(uid) : token.trim();
    const parentPageId = parseNotionPageId(pageLink);
    if (!value) return setError("Pega el token de la integración.");
    if (!parentPageId) return setError("No encuentro el identificador de la página en ese enlace.");
    setBusy(true);
    try {
      const client = createNotionClient({ token: value });
      await client.getMe();
      await client.getPage(parentPageId); // fails with a clear message if it isn't shared with the integration
      const db = await client.createDatabase({ parentPageId });
      await saveNotionConfig(stableId, {
        databaseId: db.databaseId,
        dataSourceId: db.dataSourceId,
        databaseUrl: db.url,
        parentPageId,
        createdBy: uid,
        createdAt: new Date().toISOString(),
      });
      // Links point at pages of the old database; drop them so everything is sent again.
      if (recreate) await clearNotionLinks(stableId);
      if (recreate || storeToken(value)) {
        setConfig({ ...db, databaseUrl: db.url, parentPageId });
        setPageLink("");
        showToast("Notion conectado: base de datos creada");
      }
    } catch (err) {
      setError(err.message || "No se pudo conectar con Notion.");
    }
    setBusy(false);
  }

  async function saveTokenOnly() {
    setError("");
    const value = token.trim();
    if (!value) return setError("Pega el token de la integración.");
    setBusy(true);
    try {
      await createNotionClient({ token: value }).getMe();
      if (storeToken(value)) showToast("Token guardado en este dispositivo");
    } catch (err) {
      setError(err.message || "No se pudo comprobar el token.");
    }
    setBusy(false);
  }

  function disconnect() {
    clearNotionToken(uid);
    setHasToken(false);
    showToast("Notion desconectado en este dispositivo");
  }

  const tokenField = (
    <div className="f">
      <label>Token de la integración</label>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={token}
        placeholder="ntn_… o secret_…"
        onChange={(e) => setToken(e.target.value)}
      />
    </div>
  );

  let body;
  if (config === undefined) {
    body = <div style={{ fontSize: ".8rem", color: "var(--gr)" }}>Cargando…</div>;
  } else if (config && hasToken) {
    body = (
      <>
        <div style={{ fontSize: ".85rem", marginBottom: ".6rem" }}>✅ Notion está conectado en este dispositivo.</div>
        {config.databaseUrl && (
          <a className="btn btsm" href={config.databaseUrl} target="_blank" rel="noopener noreferrer" style={{ marginBottom: ".7rem" }}>
            Abrir la base de datos →
          </a>
        )}
        <div style={{ fontSize: ".72rem", color: "var(--gr)", marginBottom: ".8rem" }}>
          Usa «↻ Enviar a Notion» en la pizarra semanal (semana visible) o en la pestaña Salud de un caballo. Los registros se
          envían a mano, nunca solos, y volver a enviar actualiza la misma página en vez de duplicarla.
        </div>
        <button type="button" className="btn btg btsm" onClick={disconnect}>
          Desconectar este dispositivo
        </button>
        {isAdmin && (
          <details style={{ marginTop: "1rem", fontSize: ".75rem", color: "var(--gr)" }}>
            <summary style={{ cursor: "pointer" }}>Crear una base de datos nueva</summary>
            <div style={{ margin: ".4rem 0" }}>
              Si has borrado la base de datos en Notion (o quieres otra), comparte una página con tu integración y pega su enlace.
              Los registros ya enviados se volverán a enviar a la base nueva.
            </div>
            <div className="f">
              <label>Enlace de la página de Notion</label>
              <input value={pageLink} placeholder="https://www.notion.so/…" onChange={(e) => setPageLink(e.target.value)} />
            </div>
            <button type="button" className="btn btsm" disabled={busy} onClick={() => connect({ recreate: true })}>
              {busy ? "Creando…" : "Crear base de datos nueva"}
            </button>
          </details>
        )}
      </>
    );
  } else if (config) {
    body = (
      <>
        <div style={{ fontSize: ".8rem", color: "var(--gr)", marginBottom: ".7rem" }}>
          La cuadra ya tiene su base de datos en Notion. Falta el token de tu integración en este dispositivo.
        </div>
        {tokenField}
        <button type="button" className="btn bts btbl" disabled={busy} onClick={saveTokenOnly}>
          Guardar token en este dispositivo
        </button>
      </>
    );
  } else if (!isAdmin) {
    body = (
      <div style={{ fontSize: ".8rem", color: "var(--gr)" }}>
        Notion aún no está configurado para esta cuadra. Pide a un administrador que lo conecte.
      </div>
    );
  } else {
    body = (
      <>
        <ol style={steps}>
          <li>
            En Notion abre <b>Ajustes → Conexiones → Desarrollar o gestionar integraciones</b> y crea una integración interna.
            Copia su token.
          </li>
          <li>Crea (o elige) una página en Notion donde quieras la base de datos y, en «···» → Conexiones, añade tu integración.</li>
          <li>Pega aquí el token y el enlace de esa página. EquiLog crea la base de datos con las columnas necesarias.</li>
        </ol>
        {tokenField}
        <div className="f">
          <label>Enlace de la página de Notion</label>
          <input value={pageLink} placeholder="https://www.notion.so/…" onChange={(e) => setPageLink(e.target.value)} />
        </div>
        <div style={{ fontSize: ".7rem", color: "var(--gr)", marginBottom: ".7rem" }}>
          El token se guarda solo en este navegador: no se sube a EquiLog ni lo ven los demás miembros. Cada persona que envíe
          datos a Notion necesita su propia integración compartida con esa página.
        </div>
        <button type="button" className="btn bts btbl" disabled={busy} onClick={() => connect()}>
          {busy ? "Conectando…" : "Conectar y crear base de datos"}
        </button>
      </>
    );
  }

  return (
    <SlideUpSheet title="Notion" onClose={onClose}>
      {body}
      {error && <div style={{ fontSize: ".78rem", color: "var(--ro)", marginTop: ".6rem" }}>⚠️ {error}</div>}
    </SlideUpSheet>
  );
}
