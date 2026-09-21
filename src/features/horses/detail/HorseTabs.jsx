import { Tabs } from "../../../components/Tabs.jsx";
import { usePermissions } from "../../../hooks/usePermissions.js";

// Ports the tab nav portion of rHorse (public/legacy-app.js:1691-1696).
export function HorseTabs({ active, onChange }) {
  const { can } = usePermissions();
  const tabs = [
    { key: "entrenos", label: "Entrenos" },
    ...(can("health") ? [{ key: "salud", label: "Salud" }] : []),
    { key: "gastos", label: "Gastos" },
    ...(can("sale") ? [{ key: "venta", label: "Venta" }] : []),
  ];
  return <Tabs tabs={tabs} active={active} onChange={onChange} />;
}
