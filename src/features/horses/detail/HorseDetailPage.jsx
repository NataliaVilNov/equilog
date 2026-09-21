import { useParams, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { HorseHeader } from "./HorseHeader.jsx";
import { HorseTabs } from "./HorseTabs.jsx";

// Ports the shell of rHorse (public/legacy-app.js:1657-1696): horse lookup, permission-
// gated tab fallback, header, and tab navigation. Tab BODIES (entrenos/salud/gastos/venta
// content) are Phase 3's job — see docs/components/horses.md for what's deferred and why.
export function HorseDetailPage() {
  const { hid } = useParams();
  const { horses } = useStableData();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const horse = horses.find((h) => h.id === hid);
  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  let tab = searchParams.get("tab") || "entrenos";
  if (tab === "salud" && !can("health")) tab = "entrenos";
  if (tab === "venta" && !can("sale")) tab = "entrenos";

  function handleTabChange(next) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="view">
      <HorseHeader horse={horse} />
      <HorseTabs active={tab} onChange={handleTabChange} />
      <div className="em">
        <p>Esta pestaña se completará en la Fase 3 de la migración.</p>
      </div>
    </div>
  );
}
