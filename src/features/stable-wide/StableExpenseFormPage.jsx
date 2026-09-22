import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";

const CATEGORIES = [
  { id: "material", label: "Material", icon: "🛒" },
  { id: "nomina", label: "Nómina", icon: "💼" },
  { id: "mantenimiento", label: "Mantenim.", icon: "🔧" },
  { id: "suministros", label: "Suministros", icon: "💡" },
  { id: "otro", label: "Otro", icon: "💸" },
];

const STATUSES = [
  { id: "pagado", label: "Pagado" },
  { id: "pendiente", label: "Pendiente" },
  { id: "parcial", label: "Parcial" },
];

// Ports rNCE (public/legacy-app.js:2313-2342).
export function StableExpenseFormPage() {
  const { eid } = useParams();
  const { cexpenses, addStableExpense, updateStableExpense, deleteStableExpense } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const editing = !!eid;
  const expense = editing ? cexpenses.find((e) => e.id === eid) : null;

  const [cat, setCat] = useState(expense ? expense.cat : CATEGORIES[0].id);
  const [concept, setConcept] = useState(expense ? expense.concept || "" : "");
  const [payee, setPayee] = useState(expense ? expense.payee || "" : "");
  const [amount, setAmount] = useState(expense ? expense.amount : "");
  const [date, setDate] = useState(expense ? expense.date : td());
  const [status, setStatus] = useState(expense ? expense.status : "pendiente");
  const [notes, setNotes] = useState(expense ? expense.notes || "" : "");

  function handleBack() {
    navigate("/cuadra?tab=gastos");
  }

  function handleSubmit() {
    const trimmedConcept = concept.trim();
    if (!trimmedConcept) {
      showToast("Concepto obligatorio");
      return;
    }
    const id = editing ? eid : uid();
    const record = {
      id,
      concept: trimmedConcept,
      cat,
      amount: Number(amount) || 0,
      date: date || td(),
      payee: payee.trim(),
      status,
      notes: notes.trim(),
    };
    if (editing) updateStableExpense(record);
    else addStableExpense(record);
    showToast(editing ? "Actualizado" : "Gasto añadido");
    handleBack();
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteStableExpense(eid);
    handleBack();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>{editing ? "Editar" : "Nuevo"} gasto de cuadra</h1>
      </div>
      <div className="f">
        <label>Categoría</label>
        <div className="og og3">
          {CATEGORIES.map((c) => (
            <div key={c.id} className={"oo" + (cat === c.id ? " active" : "")} onClick={() => setCat(c.id)}>
              <span className="ic">{c.icon}</span>
              {c.label}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Concepto</label>
        <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Jaboncillo, Sueldo..." />
      </div>
      {cat === "nomina" && (
        <div className="f">
          <label>Trabajador</label>
          <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Laura García" />
        </div>
      )}
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
        {editing && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
