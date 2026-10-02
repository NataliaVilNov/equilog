import { useState } from "react";
import { useToast } from "../../hooks/useToast.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { NotionSettingsSheet } from "./NotionSettingsSheet.jsx";
import { useNotionSync } from "./useNotionSync.js";

// "↻ Enviar a Notion" for a scope (see useNotionSync). If this device isn't connected yet it
// opens the connection sheet instead. Hidden for members without the health permission, the
// same gate as the records it sends.
export function NotionSyncButton({ scope, label = "Enviar a Notion", className = "btn btg btsm", style }) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const { run, progress } = useNotionSync();
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!can("health")) return null;

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await run(scope);
      if (result.needsSetup) setSetupOpen(true);
      else showToast((result.failed ? "⚠️ " : "✓ ") + result.message);
    } catch (err) {
      showToast("⚠️ " + (err.message || "No se pudo enviar a Notion"));
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className={className} style={style} onClick={handleClick} disabled={busy}>
        {busy ? `Enviando${progress && progress.total ? ` ${progress.done}/${progress.total}` : "…"}` : `↻ ${label}`}
      </button>
      {setupOpen && <NotionSettingsSheet onClose={() => setSetupOpen(false)} />}
    </>
  );
}
