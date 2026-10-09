import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { boardToneClass } from "../boards/boardHelpers.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { uid } from "../../lib/id.js";
import { WEEKDAYS } from "../boards/config/ClassSlotsConfig.jsx";

const TONES = ["green", "blue", "amber", "red", "purple", "teal", "gray"];

function emptyFields() {
  return { name: "", surname: "", code: "", birthYear: "", phone: "", active: true };
}

function fieldsFromStudent(s) {
  if (!s) return emptyFields();
  return {
    name: s.name || "",
    surname: s.surname || "",
    code: s.code || "",
    birthYear: s.birthYear ? String(s.birthYear) : "",
    phone: s.phone || "",
    active: s.active !== false,
  };
}

// Pestaña de alumnos del modo escuela. El formulario se despliega aquí mismo en vez de
// vivir en su propia ruta: una ficha de alumno son cinco campos, no justifica una página.
export function StudentsPage() {
  const { students, addStudent, updateStudent, deleteStudent, buildStudentCode,boardConfig, toggleStudentSlot } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [fields, setFields] = useState(emptyFields);
  const [codeTouched, setCodeTouched] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const sorted = useMemo(() => {
    const list = showInactive ? students : students.filter((s) => s.active !== false);
    return list
      .slice()
      .sort((a, b) =>
        `${a.surname || ""} ${a.name || ""}`.localeCompare(`${b.surname || ""} ${b.name || ""}`, "es")
      );
  }, [students, showInactive]);
    const slots = boardConfig.classSlots || [];
  const slotsByDay = useMemo(
    () => WEEKDAYS.map((d) => ({ ...d, slots: slots.filter((s) => s.weekday === d.id) })).filter((d) => d.slots.length),
    [slots]
  );

  // Resume el horario de un alumno en texto corto: "L 16:30 · X 17:00". Ignora ids de
  // franjas ya borradas en lugar de romperse con ellos.
  function scheduleLabel(student) {
    const ids = Array.isArray(student.schedule) ? student.schedule : [];
    const mine = slots
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
    if (!mine.length) return null;
    return mine.map((s) => `${WEEKDAYS.find((d) => d.id === s.weekday).short} ${s.start}`).join(" · ");
  }

  const autoCode = buildStudentCode(fields.name, fields.surname, editingId);
  const shownCode = codeTouched && fields.code ? fields.code : autoCode;

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function startNew() {
    setEditingId("new");
    setFields(emptyFields());
    setCodeTouched(false);
  }

  function startEdit(student) {
    setEditingId(student.id);
    setFields(fieldsFromStudent(student));
    setCodeTouched(true);
  }

  function cancel() {
    setEditingId(null);
    setFields(emptyFields());
    setCodeTouched(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = fields.name.trim();
    if (!name) {
      showToast("El nombre es obligatorio");
      return;
    }
    const year = fields.birthYear.trim();
    if (year && !/^\d{4}$/.test(year)) {
      showToast("El año debe tener 4 cifras");
      return;
    }
    const existing = editingId !== "new" ? students.find((s) => s.id === editingId) : null;
    const record = {
      id: existing ? existing.id : uid(),
      name,
      surname: fields.surname.trim(),
      code: (shownCode || "").trim().toUpperCase(),
      birthYear: year ? Number(year) : null,
      phone: fields.phone.trim(),
      active: fields.active,
      tone: existing ? existing.tone : TONES[students.length % TONES.length],
    };
    if (existing) updateStudent(record);
    else addStudent(record);
    showToast(existing ? "Alumno guardado" : "Alumno añadido");
    cancel();
  }

  function handleDelete(student) {
    if (!window.confirm(`¿Eliminar a ${student.name} y todas sus clases?`)) return;
    deleteStudent(student.id);
    showToast("Alumno eliminado");
    if (editingId === student.id) cancel();
  }

  return (
       <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/home")}>
          ←
        </button>
        <div>
          <span className="ey">Escuela</span>
          <h1>Alumnos</h1>
        </div>
      </div>
      <div className="config-intro">
        <div>
          <span className="ey">Escuela</span>
          <h2>Alumnos</h2>
          <p>
            Cada alumno tiene un código corto que es el que aparece en la pizarra semanal. Se genera solo
            a partir del nombre, pero puedes cambiarlo.
          </p>
        </div>
      </div>

      <section className="config-section">
        <div className="section-title">
          <div>
            <h2>{editingId ? (editingId === "new" ? "Nuevo alumno" : "Editar alumno") : "Ficha"}</h2>
            <p>Nombre, apellidos, año de nacimiento y un teléfono de contacto.</p>
          </div>
          {!editingId && (
            <button className="btn btsm" onClick={startNew}>
              + Nuevo alumno
            </button>
          )}
        </div>

        {editingId && (
          <form onSubmit={handleSubmit} style={{ marginBottom: ".75rem" }}>
            <div className="fb">
              <div className="fcol">
                <label>Nombre *</label>
                <input
                  value={fields.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Lucía"
                />
              </div>
              <div className="fcol">
                <label>Apellidos</label>
                <input
                  value={fields.surname}
                  onChange={(e) => setField("surname", e.target.value)}
                  placeholder="Martín Gómez"
                />
              </div>
              <div className="fcol" style={{ maxWidth: "5.5rem" }}>
                <label>Código</label>
                <input
                  value={shownCode}
                  maxLength={4}
                  onChange={(e) => {
                    setCodeTouched(true);
                    setField("code", e.target.value.toUpperCase());
                  }}
                />
              </div>
            </div>
            <div className="fb">
              <div className="fcol" style={{ maxWidth: "7rem" }}>
                <label>Año nacim.</label>
                <input
                  value={fields.birthYear}
                  onChange={(e) => setField("birthYear", e.target.value)}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="2015"
                />
              </div>
              <div className="fcol">
                <label>Teléfono</label>
                <input
                  value={fields.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  inputMode="tel"
                  placeholder="600 00 00 00"
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={fields.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
                Activo
              </label>
            </div>
            <div style={{ display: "flex", gap: ".42rem", marginTop: ".5rem" }}>
              <button className="btn bts btsm" type="submit">
                {editingId === "new" ? "Añadir alumno" : "Guardar cambios"}
              </button>
              <button className="btn btg btsm" type="button" onClick={cancel}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="config-section">
        <div className="section-title">
          <div>
            <h2>Listado</h2>
            <p>
              {sorted.length} {sorted.length === 1 ? "alumno" : "alumnos"}
              {showInactive ? " (incluyendo bajas)" : ""}
            </p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: ".4rem", flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Ver bajas
          </label>
        </div>

        {!students.length ? (
          <EmptyState icon="🧒">
            Sin alumnos todavía.
            <br />
            Pulsa <b>+ Nuevo alumno</b> para añadir el primero.
          </EmptyState>
        ) : !sorted.length ? (
          <EmptyState>No hay alumnos activos.</EmptyState>
        ) : (
          <div className="config-list">
            {sorted.map((s) => (
              <div key={s.id}>
                <div className="config-row" style={{ opacity: s.active === false ? 0.5 : 1 }}>
                  <span className={"config-code " + boardToneClass(s.tone)}>{s.code}</span>
                  <div>
                    <b>
                      {s.name} {s.surname}
                    </b>
                    <small>
                      {scheduleLabel(s) ||
                        [s.birthYear ? `${s.birthYear}` : null, s.phone || null].filter(Boolean).join(" · ") ||
                        "Sin horario asignado"}
                    </small>
                  </div>
                  <button className="btn btg btsm" style={{ flexShrink: 0 }} onClick={() => startEdit(s)}>
                    Editar
                  </button>
                  <button className="db" onClick={() => handleDelete(s)}>
                    ×
                  </button>
                </div>
                {editingId === s.id && slotsByDay.length > 0 && (
                  <div style={{ padding: ".4rem 0 .75rem 1rem" }}>
                    {slotsByDay.map((d) => (
                      <div key={d.id} style={{ marginBottom: ".35rem" }}>
                        <small style={{ opacity: 0.7 }}>{d.label}</small>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginTop: ".2rem" }}>
                          {d.slots.map((slot) => {
                            const on = (s.schedule || []).includes(slot.id);
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                className={"btn btsm " + (on ? "bts" : "btg")}
                                onClick={() => toggleStudentSlot(s.id, slot.id)}
                              >
                                {slot.start}–{slot.end}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}