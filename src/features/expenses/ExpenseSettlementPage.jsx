import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td, fD } from "../../lib/date.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import {
  ownerListForHorse,
  settlementCandidateExpenses,
  expenseSplitSummary,
  calcOwnerSettlement,
} from "./expenseSplits.js";

// Ports rExpenseSettlement/renderSettlementPreview/confirmExpenseSettlement
// (public/legacy-app.js:2030-2067,955-976).
export function ExpenseSettlementPage() {
  const { hid } = useParams();
  const { horses, expenses, expenseSettlements, addExpenseSettlement } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const horse = horses.find((h) => h.id === hid);
  const owners = horse ? ownerListForHorse(horse) : [];
  const candidates = useMemo(
    () =>
      horse ? settlementCandidateExpenses(expenses, hid, false).sort((a, b) => (a.date < b.date ? 1 : -1)) : [],
    [expenses, hid, horse]
  );
  const history = useMemo(
    () => (expenseSettlements || []).filter((x) => x.hid === hid).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenseSettlements, hid]
  );

  const [selectedIds, setSelectedIds] = useState(() => candidates.map((e) => e.id));

  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  function toggleAll(checked) {
    setSelectedIds(checked ? candidates.map((e) => e.id) : []);
  }
  function toggleOne(id, checked) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  const preview = selectedIds.length ? calcOwnerSettlement(horse, expenses, selectedIds) : null;

  function handleConfirm() {
    if (!selectedIds.length) {
      showToast("Selecciona gastos");
      return;
    }
    const c = calcOwnerSettlement(horse, expenses, selectedIds);
    addExpenseSettlement({
      id: uid(),
      hid,
      date: td(),
      expenseIds: selectedIds,
      total: c.total,
      transfers: c.transfers,
      owners: c.owners,
      warnings: c.warnings,
      createdBy: null,
    });
    showToast("Ajuste guardado");
    navigate(`/horses/${hid}?tab=gastos`);
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(`/horses/${hid}?tab=gastos`)}>
          ←
        </button>
        <h1>Ajustar cuentas</h1>
      </div>
      <div className="card">
        <div style={{ fontSize: ".88rem", color: "var(--ti)", fontWeight: 700, marginBottom: ".25rem" }}>
          {horse.name}
        </div>
        <p style={{ fontSize: ".78rem", color: "var(--gr)" }}>
          Selecciona los gastos compartidos que queréis cuadrar. La app calcula quién debe pagar a quién, tipo
          Tricount. Al confirmar, los gastos quedan marcados como ajustados.
        </p>
      </div>
      {owners.length < 2 ? (
        <EmptyState>Necesitas al menos dos propietarios en la ficha del caballo para ajustar cuentas.</EmptyState>
      ) : !candidates.length ? (
        <EmptyState>No hay gastos pendientes de ajustar.</EmptyState>
      ) : (
        <>
          <div className="card">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".45rem",
                marginBottom: ".65rem",
                textTransform: "none",
                letterSpacing: 0,
                color: "var(--vd)",
                fontSize: ".8rem",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.length === candidates.length}
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ width: "auto" }}
              />{" "}
              Seleccionar todos los gastos pendientes
            </label>
            {candidates.map((e) => {
              const sp = expenseSplitSummary(e);
              return (
                <label key={e.id} className="xc" style={{ cursor: "pointer", marginBottom: ".45rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(e.id)}
                    onChange={(ev) => toggleOne(e.id, ev.target.checked)}
                    style={{ width: "auto", marginTop: ".35rem", flexShrink: 0 }}
                  />
                  <div className="xi gasto">💸</div>
                  <div className="xinf">
                    <div className="xl">{e.concept || "Gasto"}</div>
                    <div className="xm">
                      {fD(e.date)} · {Number(e.amount || 0).toFixed(2)}€ · Pagó: {e.payer || "Sin pagador"}
                    </div>
                    {sp ? (
                      <div className="pd">
                        <span>👥</span>
                        <span>{sp}</span>
                      </div>
                    ) : (
                      <div className="pd">
                        <span>ℹ️</span>
                        <span>Sin reparto: se usará el porcentaje de propiedad.</span>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          {preview ? (
            <div className="card" style={{ marginTop: ".8rem" }}>
              <div
                style={{
                  fontSize: ".7rem",
                  fontWeight: 800,
                  color: "var(--gr)",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  marginBottom: ".55rem",
                }}
              >
                Resultado del ajuste
              </div>
              <div className="vr">
                <span className="vrl">Gastos seleccionados</span>
                <span className="vrv">{preview.used.length}</span>
              </div>
              <div className="vr">
                <span className="vrl">Total ajustado</span>
                <span className="vrv">{preview.total.toFixed(2)}€</span>
              </div>
              <div style={{ marginTop: ".65rem" }}>
                {preview.owners.map((o) => (
                  <div className="vr" key={o.key}>
                    <span className="vrl">{o.name}</span>
                    <span className={"vrv " + (o.balance >= 0 ? "pos" : "neg")}>
                      {o.balance >= 0 ? "+" : ""}
                      {o.balance.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: ".75rem" }}>
                {preview.transfers.length ? (
                  preview.transfers.map((t, i) => (
                    <div className="xc" key={i} style={{ marginBottom: ".4rem" }}>
                      <div className="xi ingreso">↔️</div>
                      <div className="xinf">
                        <div className="xl">
                          {t.from} debe pagar a {t.to}
                        </div>
                        <div className="xm">
                          <b>{t.amount.toFixed(2)}€</b>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ap ok">✓ Cuentas cuadradas</div>
                )}
              </div>
              {preview.warnings.length > 0 && (
                <div className="vpw" style={{ marginTop: ".6rem" }}>
                  {preview.warnings.map((w, i) => (
                    <div key={i}>⚠️ {w}</div>
                  ))}
                </div>
              )}
              <button className="btn bts btbl" style={{ marginTop: ".75rem" }} onClick={handleConfirm}>
                Marcar estos gastos como ajustados
              </button>
            </div>
          ) : (
            <div className="em" style={{ padding: "1rem" }}>
              <p>Selecciona algún gasto para calcular el ajuste.</p>
            </div>
          )}
        </>
      )}
      {history.length > 0 && (
        <>
          <div className="sh">
            <h2>Ajustes anteriores</h2>
          </div>
          {history.map((st) => (
            <div className="card" key={st.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}>
                <div>
                  <b>{fD(st.date)}</b>
                  <div style={{ fontSize: ".75rem", color: "var(--gr)" }}>
                    {(st.expenseIds || []).length} gastos · {Number(st.total || 0).toFixed(2)}€
                  </div>
                </div>
              </div>
              <div style={{ marginTop: ".55rem" }}>
                {(st.transfers || []).length ? (
                  st.transfers.map((t, i) => (
                    <div className="pd" key={i}>
                      <span>↔️</span>
                      <span>
                        {t.from} pagó a {t.to} <b>{Number(t.amount || 0).toFixed(2)}€</b>
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="ap ok">Cuentas cuadradas</span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
