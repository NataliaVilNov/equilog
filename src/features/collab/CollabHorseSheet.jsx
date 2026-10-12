import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseClient.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";
import { HK } from "../../lib/constants.js";
import { useHorseHealth } from "./useAccessHorses.js";

// Ficha que ve un colaborador externo: datos del caballo y su historial de salud.
//
// Escribe el registro directamente con setDoc en vez de usar addHealthRecord de
// StableDataContext, porque ese contexto no está disponible aquí: carga datos de una cuadra
// activa, y un colaborador no tiene ninguna.
//
// Y a diferencia del formulario de la cuadra, aquí NO hay importe ni gasto asociado: las
// reglas solo abren salud a un colaborador, así que crear el gasto haría fallar la
// escritura entera.
export function CollabHorseSheet({ stableId, horse, canEdit, onClose }) {
  const { health, loading, reload } = useHorseHealth(stableId, horse.id);
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("vacuna");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(td());
  const [nxt, setNxt] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setAdding(false);
    setType("vacuna");
    setLabel("");
    setDate(td());
    setNxt("");
    setNotes("");
  }

  async function handleSave() {
    setSaving(true);
    const id = uid();
    try {
      await setDoc(doc(db, "stables", stableId, "horses", horse.id, "health", id), {
        id,
        stableId,
        hid: horse.id,
        type,
        label: label.trim(),
        date: date || td(),
        nxt: nxt || null,
        notes: notes.trim(),
        amount: 0,
        payStatus: "pendiente",
        payee: "",
      });
      showToast("Registro añadido");
      resetForm();
      reload();
    } catch (err) {
      showToast(
        err.code === "permission-denied"
          ? "No tienes permiso para escribir en este caballo"
          : "Error al guardar: " + err.message
      );
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = (id) => {
    const t = HK.find((x) => x.id === id);
    return t ? t.l : id;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(44,41,37,.55)",
        backdropFilter: "blur(3px)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        <div
          style={{
            background: "var(--fo)",
            borderRadius: "18px",
            padding: "1.2rem",
            border: "1px solid var(--li)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem" }}>{horse.name}</h2>
              <div style={{ fontSize: ".76rem", color: "var(--gr)" }}>
                {[horse.breed, horse.sex, horse.birth].filter(Boolean).join(" · ") || "Sin datos"}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: "1.35rem", color: "var(--gr)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              fontSize: ".66rem",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--gr)",
              fontWeight: 800,
              margin: "1rem 0 .5rem",
            }}
          >
            Historial de salud
          </div>

          {loading && <div style={{ fontSize: ".8rem", color: "var(--gr)" }}>Cargando…</div>}
          {!loading && !health.length && (
            <div style={{ fontSize: ".8rem", color: "var(--gr)" }}>Sin registros todavía.</div>
          )}

          {health.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--li)",
                borderRadius: "10px",
                padding: ".5rem .7rem",
                marginBottom: ".3rem",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: ".84rem" }}>
                {typeLabel(r.type)}
                {r.label ? " · " + r.label : ""}
              </div>
              <div style={{ fontSize: ".73rem", color: "var(--gr)" }}>
                {r.date}
                {r.nxt ? " · próxima: " + r.nxt : ""}
              </div>
              {r.notes && (
                <div style={{ fontSize: ".76rem", marginTop: ".2rem" }}>{r.notes}</div>
              )}
            </div>
          ))}

          {canEdit && (
            <div style={{ marginTop: ".8rem", borderTop: "1px solid var(--li)", paddingTop: ".8rem" }}>
              {adding ? (
                <>
                  <div className="f">
                    <label>Tipo</label>
                    <div className="og og4">
                      {HK.map((ht) => (
                        <div
                          key={ht.id}
                          className={"oo" + (type === ht.id ? " active" : "")}
                          onClick={() => setType(ht.id)}
                        >
                          <span className="ic">{ht.i}</span>
                          {ht.l}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="f">
                    <label>Descripción / Producto</label>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} />
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
                  <div style={{ display: "grid", gap: ".3rem" }}>
                    <button className="btn bts btbl" onClick={handleSave} disabled={saving}>
                      Añadir registro
                    </button>
                    <button className="btn btg btbl" onClick={resetForm} disabled={saving}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn btsm bts" style={{ width: "100%" }} onClick={() => setAdding(true)}>
                  + Añadir registro de salud
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}