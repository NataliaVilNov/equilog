import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";
import { HK } from "../../lib/constants.js";

// Ports rNH (public/legacy-app.js:1995-2027). The route-level PermissionRoute("health")
// replaces requirePermissionView.
export function HealthFormPage() {
  const { hid, eid } = useParams();
  const { horses, health, addHealthRecord, updateHealthRecord, deleteHealthRecord } = useStableData();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const horse = horses.find((h) => h.id === hid);
  const editing = !!eid;
  const record = editing ? health.find((r) => r.id === eid) : null;

  const [type, setType] = useState(record ? record.type : "herraje");
  const [label, setLabel] = useState(record ? record.label || "" : "");
  const [date, setDate] = useState(record ? record.date : td());
  const [nxt, setNxt] = useState(record && record.nxt ? record.nxt : "");
  const [notes, setNotes] = useState(record ? record.notes || "" : "");
  const [amount, setAmount] = useState(record && record.amount ? record.amount : "");
  const [payStatus, setPayStatus] = useState(record ? record.payStatus || "pendiente" : "pendiente");
  const [payee, setPayee] = useState(record ? record.payee || "" : "");

  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  function handleBack() {
    navigate(`/horses/${hid}?tab=salud`);
  }

  function handleSubmit() {
    const id = editing ? eid : uid();
    const rec = {
      id,
      hid,
      type,
      label: label.trim(),
      date: date || td(),
      nxt: nxt || null,
      notes: notes.trim(),
      amount: Number(amount) || 0,
      payStatus,
      payee: payee.trim(),
    };
    if (editing) updateHealthRecord(rec);
    else addHealthRecord(rec);
    showToast(editing ? "Guardado" : "Registro añadido");
    handleBack();
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteHealthRecord(eid);
    handleBack();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>
          {editing ? "Editar" : "Nuevo"} registro · {horse.name}
        </h1>
      </div>
      <div className="f">
        <label>Tipo</label>
        <div className="og og4">
          {HK.map((ht) => (
            <div key={ht.id} className={"oo" + (type === ht.id ? " active" : "")} onClick={() => setType(ht.id)}>
              <span className="ic">{ht.i}</span>
              {ht.l}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Descripción / Producto</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ivermectina, Vacuna..." />
      </div>
      <div className="r2">
        <div className="f">
          <label>Fecha realizado</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f">
          <label>Próxima vez</label>
          <input type="date" value={nxt} onChange={(e) => setNxt(e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="card" style={{ padding: ".75rem", marginBottom: ".85rem" }}>
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 700,
            color: "var(--gr)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: ".6rem",
          }}
        >
          💰 Gasto asociado (opcional)
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
            <label>Estado del pago</label>
            <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="parcial">Parcial</option>
            </select>
          </div>
        </div>
        <div className="f" style={{ marginBottom: 0 }}>
          <label>Proveedor / A quién se paga</label>
          <input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Ej: Veterinario García, Herrador José..."
          />
        </div>
      </div>
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar cambios" : "Añadir registro"}
        </button>
        {editing && can("deleteItems") && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
