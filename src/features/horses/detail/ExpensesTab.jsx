import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { StatGrid } from "../../../components/StatGrid.jsx";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { expenseCategoryById } from "../../../lib/constants.js";
import { fD } from "../../../lib/date.js";
import { expenseSplitSummary } from "../../expenses/expenseSplits.js";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Ports the "gastos" tab body of rHorse (public/legacy-app.js:1768-1785).
export function ExpensesTab({ horse }) {
  const { expenses, deleteExpense } = useStableData();
  const { isAdmin, can } = usePermissions();
  const navigate = useNavigate();

  const ex = useMemo(
    () => expenses.filter((e) => e.hid === horse.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, horse.id]
  );
  const totEx = ex.reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendEx = ex.filter((e) => e.status !== "pagado").reduce((s, e) => s + Number(e.amount || 0), 0);

  function handleDelete(id) {
    if (!window.confirm("¿Eliminar?")) return;
    deleteExpense(id);
  }

  return (
    <>
      {isAdmin && (
        <StatGrid
          stats={[
            { value: totEx.toFixed(0) + "€", label: "Total" },
            { value: pendEx.toFixed(0) + "€", label: "Pendiente", tone: "red" },
          ]}
        />
      )}
      <div style={{ display: "grid", gap: ".42rem", marginBottom: ".8rem" }}>
        <button className="btn bts btbl" onClick={() => navigate(`/horses/${horse.id}/expenses/new`)}>
          + Añadir gasto
        </button>
        <button className="btn btg btbl" onClick={() => navigate(`/horses/${horse.id}/expenses/settlement`)}>
          ↔️ Ajustar cuentas entre propietarios
        </button>
      </div>
      {!ex.length ? (
        <EmptyState>Sin gastos todavía.</EmptyState>
      ) : (
        ex.map((e) => {
          const ec = expenseCategoryById(e.cat);
          const isIn = ec.d === "in";
          const sp = expenseSplitSummary(e);
          return (
            <div className="xc" key={e.id}>
              <div className={"xi " + (isIn ? "ingreso" : "gasto")}>{ec.i}</div>
              <div className="xinf">
                <div className="xl">{e.concept}</div>
                <div className="xm">
                  {fD(e.date)} ·{" "}
                  <b>
                    {isIn ? "" : "-"}
                    {Number(e.amount).toFixed(2)}€
                  </b>
                </div>
                <div className="pd">
                  {isIn ? "←" : "→"} {e.payer || "?"} → {e.payee || "?"}
                </div>
                {sp && (
                  <div className="pd" style={{ alignItems: "flex-start" }}>
                    <span>👥</span>
                    <span>
                      <b>Reparto:</b> {sp}
                    </span>
                  </div>
                )}
                {e.settled && (
                  <div className="pd">
                    <span>✅</span>
                    <span>Ajustado el {e.settledDate ? fD(e.settledDate) : ""}</span>
                  </div>
                )}
                <div style={{ marginTop: ".18rem" }}>
                  <span className={"sb s-" + e.status}>{capitalize(e.status)}</span>
                  {e.settled && <span className="sb s-pagado"> Ajustado</span>}
                </div>
              </div>
              <div className="ca">
                <button className="ib" onClick={() => navigate(`/horses/${horse.id}/expenses/${e.id}/edit`)}>
                  ✏️
                </button>
                {can("expenses") && (
                  <button className="db" onClick={() => handleDelete(e.id)}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
