import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";
import { EK } from "../../lib/constants.js";
import { defaultExpenseSplitsForHorse } from "./expenseSplits.js";

const STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "pagado", label: "Pagado" },
  { id: "parcial", label: "Parcial" },
];

// Ports rNE (public/legacy-app.js:2069-2130) and the expense-save handler
// (public/legacy-app.js:3713-3730). Deviates from legacy in one small way: the new-expense
// category default is EK[0].id ("vet") instead of legacy's mismatched literal "servicio"
// (which doesn't match any EK id, so no pill actually shows as selected until clicked) —
// see docs/components/expenses.md.
export function ExpenseFormPage() {
  const { hid, eid } = useParams();
  const { horses, expenses, addExpense, updateExpense, deleteExpense } = useStableData();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const horse = horses.find((h) => h.id === hid);
  const editing = !!eid;
  const expense = editing ? expenses.find((e) => e.id === eid) : null;

  const [cat, setCat] = useState(expense ? expense.cat : EK[0].id);
  const [concept, setConcept] = useState(expense ? expense.concept || "" : "");
  const [amount, setAmount] = useState(expense ? expense.amount : "");
  const [date, setDate] = useState(expense ? expense.date : td());
  const [payer, setPayer] = useState(expense ? expense.payer || "" : "");
  const [payee, setPayee] = useState(expense ? expense.payee || "" : "");
  const [status, setStatus] = useState(expense ? expense.status : "pendiente");
  const [notes, setNotes] = useState(expense ? expense.notes || "" : "");
  const [useSplits, setUseSplits] = useState(
    !!(expense && Array.isArray(expense.splits) && expense.splits.length)
  );
  const [splits, setSplits] = useState(() => defaultExpenseSplitsForHorse(horse, expense));

  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  const direction = (EK.find((c) => c.id === cat) || {}).d || "out";
  const owners =
    horse.owners && horse.owners.length ? horse.owners : horse.owner ? [{ nombre: horse.owner, pct: 100 }] : [];
  const payerMatchesOwner = owners.some((o) => (o.nombre || "") === payer);
  const splitTotal = splits.reduce((s, x) => s + (Number(x.pct) || 0), 0);
  const splitWarn = useSplits && splits.length > 1 && Math.abs(splitTotal - 100) > 0.5;

  function handleBack() {
    navigate(`/horses/${hid}?tab=gastos`);
  }

  function updateSplit(i, field, value) {
    setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function handleEqualSplit() {
    setSplits((prev) => prev.map((s) => ({ ...s, pct: Number((100 / prev.length).toFixed(0)) })));
  }

  function handleSubmit() {
    const trimmedConcept = concept.trim();
    if (!trimmedConcept) {
      showToast("Concepto obligatorio");
      return;
    }
    let finalSplits = [];
    if (useSplits) {
      finalSplits = splits
        .map((s) => ({ name: (s.name || "").trim(), pct: Number(s.pct) || 0 }))
        .filter((s) => s.name && s.pct > 0);
      const total = finalSplits.reduce((s, x) => s + x.pct, 0);
      if (Math.abs(total - 100) > 0.5) {
        showToast("El reparto debe sumar 100%");
        return;
      }
    }
    const id = editing ? eid : uid();
    const record = {
      id,
      createdBy: null,
      hid,
      concept: trimmedConcept,
      amount: Number(amount) || 0,
      date: date || td(),
      cat,
      payer,
      payee: payee.trim(),
      status,
      notes: notes.trim(),
      splits: finalSplits,
    };
    if (editing) updateExpense(record);
    else addExpense(record);
    showToast(editing ? "Actualizado" : "Gasto añadido");
    handleBack();
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    deleteExpense(eid);
    handleBack();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>
          {editing ? "Editar" : "Nuevo"} gasto · {horse.name}
        </h1>
      </div>
      <div className="f">
        <label>Categoría</label>
        <div className="og og3">
          {EK.map((c) => (
            <div key={c.id} className={"oo" + (cat === c.id ? " active" : "")} onClick={() => setCat(c.id)}>
              <span className="ic">{c.i}</span>
              {c.l}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Concepto</label>
        <input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Pensión mensual, Herrador..."
        />
      </div>
      <div className="r2">
        <div className="f">
          <label>Importe (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="f">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {splits.length > 0 && (
        <div className="card" style={{ padding: ".75rem", marginBottom: ".85rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: ".6rem",
              marginBottom: ".55rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: ".7rem",
                  fontWeight: 700,
                  color: "var(--gr)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                👥 Reparto del gasto
              </div>
              <div style={{ fontSize: ".72rem", color: "var(--gr)", marginTop: ".1rem" }}>
                Para gastos compartidos: mitad, porcentajes entre propietarios, etc.
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".35rem",
                fontSize: ".72rem",
                color: "var(--vd)",
                fontWeight: 700,
                margin: 0,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              <input
                type="checkbox"
                checked={useSplits}
                onChange={(e) => setUseSplits(e.target.checked)}
                style={{ width: "auto" }}
              />{" "}
              Repartir
            </label>
          </div>
          {useSplits && (
            <div>
              {splits.map((sp, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 76px 82px",
                    gap: ".45rem",
                    alignItems: "center",
                    marginBottom: ".45rem",
                  }}
                >
                  <input
                    value={sp.name || ""}
                    placeholder="Nombre"
                    onChange={(e) => updateSplit(i, "name", e.target.value)}
                    style={{ fontSize: ".82rem", padding: ".45rem .55rem" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--ar)",
                      borderRadius: "8px",
                      padding: ".22rem .45rem",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={sp.pct ?? 0}
                      onChange={(e) => updateSplit(i, "pct", Number(e.target.value) || 0)}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: ".2rem .1rem",
                        fontSize: ".82rem",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: ".75rem", color: "var(--gr)", fontWeight: 700 }}>%</span>
                  </div>
                  <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--vd)", textAlign: "right" }}>
                    {(((Number(amount) || 0) * Number(sp.pct || 0)) / 100).toFixed(2)}€
                  </div>
                </div>
              ))}
              {splitWarn && (
                <div style={{ fontSize: ".72rem", color: "var(--am)", fontWeight: 700, marginTop: ".25rem" }}>
                  ⚠️ El reparto suma {splitTotal.toFixed(0)}%. Debe sumar 100%.
                </div>
              )}
              <button type="button" className="btn btg btsm" onClick={handleEqualSplit}>
                Repartir a partes iguales
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: ".75rem", marginBottom: ".85rem" }}>
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 700,
            color: "var(--gr)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: ".5rem",
          }}
        >
          {direction === "in" ? "INGRESO: ¿Quién paga?" : "GASTO: ¿A quién?"}
        </div>
        <div className="r2">
          <div className="f">
            <label>{direction === "in" ? "De (propietario)" : "De (cuadra)"}</label>
            {owners.length ? (
              <>
                <select
                  value={payerMatchesOwner ? payer : ""}
                  onChange={(e) => setPayer(e.target.value)}
                  style={{ marginBottom: ".35rem" }}
                >
                  <option value="">— Otro / Escribir —</option>
                  {owners.map((o, i) => (
                    <option key={i} value={o.nombre || ""}>
                      {o.nombre || ""} ({o.pct}%)
                    </option>
                  ))}
                </select>
                {!payerMatchesOwner && (
                  <input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Otro pagador..." />
                )}
              </>
            ) : (
              <input
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder={direction === "in" ? "Ej: María Pérez" : "Cuadra Vilela"}
              />
            )}
          </div>
          <div className="f">
            <label>{direction === "in" ? "A (cuadra)" : "A (proveedor)"}</label>
            <input
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder={direction === "in" ? "Cuadra Vilela" : "Ej: Herrador José"}
            />
          </div>
        </div>
      </div>

      <div className="f">
        <label>Estado</label>
        <div className="og og3">
          {STATUSES.map((s) => (
            <div key={s.id} className={"oo" + (status === s.id ? " active" : "")} onClick={() => setStatus(s.id)}>
              {s.label}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar cambios" : "Añadir gasto"}
        </button>
        {editing && can("expenses") && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar gasto
          </button>
        )}
      </div>
    </div>
  );
}
