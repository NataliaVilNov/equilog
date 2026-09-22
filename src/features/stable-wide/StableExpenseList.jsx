import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { fD } from "../../lib/date.js";
import { StatGrid } from "../../components/StatGrid.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Ports the "gastos" tab of rCuadra (public/legacy-app.js:2259-2277).
export function StableExpenseList() {
  const { stableExpenses, deleteStableExpense } = useStableData();
  const navigate = useNavigate();

  const sorted = [...stableExpenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totEx = sorted.reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendEx = sorted.filter((e) => e.status !== "pagado").reduce((s, e) => s + Number(e.amount || 0), 0);

  function handleDelete(id) {
    if (!window.confirm("¿Eliminar?")) return;
    deleteStableExpense(id);
  }

  return (
    <>
      <StatGrid
        stats={[
          { value: totEx.toFixed(0) + "€", label: "Total cuadra", tone: "mo" },
          { value: pendEx.toFixed(0) + "€", label: "Pendiente", tone: "red" },
        ]}
      />
      {!sorted.length ? (
        <EmptyState>Sin gastos de cuadra.</EmptyState>
      ) : (
        sorted.map((e) => (
          <div className="xc" key={e.id}>
            <div className="xi cuadra">{e.cat === "nomina" ? "💼" : "🏠"}</div>
            <div className="xinf">
              <div className="xl">{e.concept}</div>
              <div className="xm">
                {fD(e.date)} · <b>{Number(e.amount).toFixed(2)}€</b>
                {e.notes ? " · " + e.notes : ""}
              </div>
              {e.cat === "nomina" && e.payee && <div className="pd">→ Nómina de {e.payee}</div>}
              <div style={{ marginTop: ".18rem" }}>
                <span className={"sb s-" + e.status}>{capitalize(e.status)}</span>
              </div>
            </div>
            <div className="ca">
              <button className="ib" onClick={() => navigate(`/cuadra/expenses/${e.id}/edit`)}>
                ✏️
              </button>
              <button className="db" onClick={() => handleDelete(e.id)}>
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
