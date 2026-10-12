import { useState } from "react";
import { useStableData } from "../../hooks/useStableData.js";
import { useCollaborators } from "../../contexts/CollaboratorsContext.jsx";
import { useToast } from "../../hooks/useToast.js";
import { COLLABORATOR_TYPES, collaboratorTypeLabel } from "../../lib/collaboratorTypes.js";

// Apartado plegable de Colaboradores dentro de la pantalla de Equipo. Comparten sitio en la
// interfaz, no en los datos: un colaborador NO tiene ficha en team, así que no sale en el
// calendario de equipo ni en las listas de asignar tareas.
export function CollaboratorsSection() {
  const { horses } = useStableData();
  const { collaborators, inviteCollaborator, setCollaboratorHorses, removeCollaborator } =
    useCollaborators();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("vet");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [horseIds, setHorseIds] = useState([]);
  const [editingId, setEditingId] = useState(null);

  function toggleHorse(hid) {
    setHorseIds((prev) => (prev.includes(hid) ? prev.filter((x) => x !== hid) : [...prev, hid]));
  }

  function resetForm() {
    setAdding(false);
    setType("vet");
    setName("");
    setEmail("");
    setHorseIds([]);
  }

  async function handleInvite() {
    try {
      const code = await inviteCollaborator({ type, name, email, horseIds });
      try {
        await navigator.clipboard.writeText(code);
        showToast("Código copiado: " + code);
      } catch (_e) {
        showToast("Código: " + code);
      }
      resetForm();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleRemove(c) {
    if (!window.confirm(`¿Quitar el acceso de ${c.name || c.email || "este colaborador"}?`)) return;
    try {
      await removeCollaborator(c.id);
      showToast("Acceso retirado");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  }

  async function handleSaveHorses(c, ids) {
    try {
      await setCollaboratorHorses(c.id, ids);
      setEditingId(null);
      showToast("Caballos actualizados");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  }

  return (
    <div className="card" style={{ padding: ".85rem", marginTop: "1rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ti)" }}>
          🤝 Colaboradores{collaborators.length ? ` (${collaborators.length})` : ""}
        </span>
        <span style={{ color: "var(--gr)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: ".75rem" }}>
          <p style={{ fontSize: ".74rem", color: "var(--gr)", lineHeight: 1.45, marginBottom: ".6rem" }}>
            Gente de fuera que trabaja con la cuadra de forma puntual. No forman parte del
            equipo: solo ven los caballos que les marques.
          </p>

          {!collaborators.length && !adding && (
            <div style={{ fontSize: ".8rem", color: "var(--gr)", marginBottom: ".6rem" }}>
              Todavía no hay colaboradores.
            </div>
          )}

          {collaborators.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid var(--li)",
                borderRadius: "12px",
                padding: ".6rem .75rem",
                marginBottom: ".4rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: ".5rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".88rem" }}>
                    {c.name || c.email || "Sin nombre"}
                  </div>
                  <div style={{ fontSize: ".74rem", color: "var(--gr)" }}>
                    {collaboratorTypeLabel(c.type)} · {(c.horseIds || []).length} caballo
                    {(c.horseIds || []).length !== 1 ? "s" : ""}
                  </div>
                  <span className={"ap " + (c.status === "active" ? "ok" : "")}>
                    {c.status === "active" ? "Activo" : "Pendiente · código " + (c.code || "")}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                  <button
                    className="btn btsm btg"
                    onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  >
                    Caballos
                  </button>
                  <button className="btn btsm btr" onClick={() => handleRemove(c)}>
                    Quitar
                  </button>
                </div>
              </div>
              {editingId === c.id && (
                <HorsePicker
                  horses={horses}
                  selected={c.horseIds || []}
                  onSave={(ids) => handleSaveHorses(c, ids)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}

          {adding ? (
            <div
              style={{
                border: "1px solid var(--li)",
                borderRadius: "12px",
                padding: ".75rem",
                marginTop: ".5rem",
              }}
            >
              <div className="f">
                <label>Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {COLLABORATOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.ready ? "" : " (todavía sin acceso)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label>Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana Ruiz" />
              </div>
              <div className="f">
                <label>Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@email.com"
                />
              </div>
              <div className="f">
                <label>Caballos a los que accede</label>
                {!horses.length ? (
                  <div style={{ fontSize: ".78rem", color: "var(--gr)" }}>
                    Esta cuadra todavía no tiene caballos.
                  </div>
                ) : (
                  horses.map((h) => (
                    <label
                      key={h.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".5rem",
                        fontSize: ".82rem",
                        fontWeight: 700,
                        color: "var(--ti)",
                        textTransform: "none",
                        letterSpacing: 0,
                        marginBottom: ".3rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={horseIds.includes(h.id)}
                        onChange={() => toggleHorse(h.id)}
                        style={{ width: "auto" }}
                      />
                      {h.name}
                    </label>
                  ))
                )}
              </div>
              <div style={{ display: "grid", gap: ".3rem" }}>
                <button className="btn bts btbl" onClick={handleInvite}>
                  Crear invitación
                </button>
                <button className="btn btg btbl" onClick={resetForm}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btsm btg"
              style={{ width: "100%", marginTop: ".4rem" }}
              onClick={() => setAdding(true)}
            >
              + Añadir colaborador
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Selector de caballos para un colaborador ya creado. Estado propio para que cancelar no
// deje a medias lo que había guardado.
function HorsePicker({ horses, selected, onSave, onCancel }) {
  const [ids, setIds] = useState(selected);
  return (
    <div style={{ marginTop: ".6rem", borderTop: "1px solid var(--li)", paddingTop: ".6rem" }}>
      {horses.map((h) => (
        <label
          key={h.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
            fontSize: ".82rem",
            fontWeight: 700,
            color: "var(--ti)",
            marginBottom: ".3rem",
          }}
        >
          <input
            type="checkbox"
            checked={ids.includes(h.id)}
            onChange={() =>
              setIds((prev) => (prev.includes(h.id) ? prev.filter((x) => x !== h.id) : [...prev, h.id]))
            }
            style={{ width: "auto" }}
          />
          {h.name}
        </label>
      ))}
      <div style={{ display: "flex", gap: ".3rem", marginTop: ".4rem" }}>
        <button className="btn btsm bts" onClick={() => onSave(ids)}>
          Guardar
        </button>
        <button className="btn btsm btg" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}