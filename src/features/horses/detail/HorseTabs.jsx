import { Tabs } from "../../../components/Tabs.jsx";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { canViewHorseInfo } from "../horseAccess.js";

// Ports the tab nav portion of rHorse (public/legacy-app.js:1691-1696).
export function HorseTabs({ horse, active, onChange }) {
  const { can, isAdmin, uid } = usePermissions();
  const authorized = canViewHorseInfo(horse, isAdmin, uid);
  const tabs = [
    { key: "entrenos", label: "Entrenos" },
    ...(can("health") ? [{ key: "salud", label: "Salud" }] : []),
    ...(authorized ? [{ key: "gastos", label: "Gastos" }] : []),
    ...(authorized && can("sale") ? [{ key: "venta", label: "Venta" }] : []),
  ];
  return <Tabs tabs={tabs} active={active} onChange={onChange} />;
}
