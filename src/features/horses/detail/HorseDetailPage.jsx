import { useParams, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { canViewHorseInfo } from "../horseAccess.js";
import { HorseHeader } from "./HorseHeader.jsx";
import { HorseTabs } from "./HorseTabs.jsx";
import { TrainingTab } from "./TrainingTab.jsx";
import { HealthTab } from "./HealthTab.jsx";
import { ExpensesTab } from "./ExpensesTab.jsx";
import { SaleTab } from "../sale/SaleTab.jsx";

// Ports the shell of rHorse (public/legacy-app.js:1657-1696): horse lookup, permission-
// gated tab fallback, header, and tab navigation. All four tab bodies now land here —
// see docs/components/horses.md for the full breakdown.
export function HorseDetailPage() {
  const { hid } = useParams();
  const { horses } = useStableData();
  const { can, isAdmin, uid } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const horse = horses.find((h) => h.id === hid);
  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  const authorized = canViewHorseInfo(horse, isAdmin, uid);
  let tab = searchParams.get("tab") || "entrenos";
  if (tab === "salud" && !can("health")) tab = "entrenos";
  if (tab === "gastos" && !authorized) tab = "entrenos";
  if (tab === "venta" && !(can("sale") && authorized)) tab = "entrenos";

  function handleTabChange(next) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="view">
      <HorseHeader horse={horse} />
      <HorseTabs horse={horse} active={tab} onChange={handleTabChange} />
      {tab === "entrenos" && <TrainingTab horse={horse} />}
      {tab === "salud" && <HealthTab horse={horse} />}
      {tab === "gastos" && <ExpensesTab horse={horse} />}
      {tab === "venta" && <SaleTab horse={horse} />}
    </div>
  );
}
