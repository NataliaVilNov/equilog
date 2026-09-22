import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { EM } from "../../lib/constants.js";
import { defaultTeamPermissions } from "../../lib/permissions.js";

const PERM_OPTS = [
  ["horses", "Añadir/editar caballos", "Puede crear caballos y editar datos básicos"],
  ["trainings", "Entrenamientos", "Puede añadir entrenamientos y rellenar fichas"],
  ["tasks", "Tareas", "Puede crear y modificar sus tareas"],
  ["expenses", "Gastos", "Puede añadir y editar gastos, sin eliminarlos"],
  ["health", "Salud / Herrajes / Vacunas", "Puede añadir y editar registros sanitarios"],
  ["reports", "Informes", "Puede generar informes de caballos"],
  ["stats", "Estadísticas", "Puede ver estadísticas generales"],
  ["team", "Equipo", "Puede ver/gestionar equipo y plantillas"],
  ["stable", "Cuadra", "Puede ver/gestionar tareas y gastos de cuadra"],
  ["sale", "Venta", "Puede ver precios de venta y liquidaciones"],
  ["deleteItems", "Eliminar registros", "Puede eliminar gastos, salud, entrenos, tareas o caballos"],
];

// Ports rMF (public/legacy-app.js:3379-3419). The 11-checkbox permissions editor is kept
// inline rather than a separate component — one consumer, same call made for Home (Phase 4).
export function TeamMemberFormPage() {
  const { mid } = useParams();
  const { team, addTeamMember, updateTeamMember, deleteTeamMember } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const editing = !!mid;
  const member = editing ? team.find((m) => m.id === mid) : null;

  const [photo, setPhoto] = useState(member ? member.photo || null : null);
  const [emoji, setEmoji] = useState(member ? member.emoji || "👤" : "👤");
  const [name, setName] = useState(member ? member.name || "" : "");
  const [role, setRole] = useState(member ? member.role || "" : "");
  const [aliases, setAliases] = useState(member ? member.aliases || member.alias || "" : "");
  const [phone, setPhone] = useState(member ? member.phone || "" : "");
  const [email, setEmail] = useState(member ? member.email || "" : "");
  const [permissions, setPermissions] = useState(() => ({
    ...defaultTeamPermissions(),
    ...(member && member.permissions ? member.permissions : {}),
  }));

  if (editing && !member) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function togglePermission(key) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Nombre obligatorio");
      return;
    }
    const id = editing ? mid : uid();
    const record = {
      id,
      name: trimmedName,
      role: role.trim(),
      aliases: aliases.trim(),
      phone: phone.trim(),
      email: email.trim(),
      emoji: emoji || "👤",
      photo,
      permissions,
      uid: editing && member ? member.uid || null : null,
      userId: editing && member ? member.userId || null : null,
      authUid: editing && member ? member.authUid || null : null,
      linkedAt: editing && member ? member.linkedAt || null : null,
      linkedName: editing && member ? member.linkedName || null : null,
      linkedEmail: editing && member ? member.linkedEmail || null : null,
    };
    if (editing) updateTeamMember(record);
    else addTeamMember(record);
    showToast(editing ? "Guardado" : "Miembro añadido");
    navigate("/team");
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar?")) return;
    deleteTeamMember(mid);
    showToast("Eliminado");
    navigate("/team");
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/team")}>
          ←
        </button>
        <h1>{editing ? "Editar" : "Nuevo"} miembro</h1>
      </div>
      <div className="f">
        <label>Foto</label>
        <div className="pu">
          <div className="pp" style={{ borderRadius: "50%" }}>
            {photo ? <img src={photo} alt="" /> : emoji}
          </div>
          <label className="fl">
            Foto
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
        </div>
      </div>
      <div className="f">
        <label>Avatar</label>
        <div className="pch">
          {EM.map((e) => (
            <div
              key={e}
              className={"pc" + (emoji === e ? " active" : "")}
              onClick={() => setEmoji(e)}
              style={{ fontSize: "1.2rem", padding: ".3rem .5rem" }}
            >
              {e}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Nombre *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laura García" />
      </div>
      <div className="f">
        <label>Rol</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Mozo de cuadra" />
      </div>
      <div className="f">
        <label>Alias / mote para órdenes</label>
        <input
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          placeholder="Ej: Ale, Alex, Isa, Nati"
        />
      </div>
      <div className="f">
        <label>Contacto</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="600 000 000" />
      </div>
      <div className="f">
        <label>Email de acceso (opcional)</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@email.com" />
      </div>
      <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem" }}>
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 700,
            color: "var(--gr)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: ".65rem",
          }}
        >
          Permisos del integrante
        </div>
        {PERM_OPTS.map(([key, label, desc]) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: ".55rem",
              textTransform: "none",
              letterSpacing: 0,
              fontSize: ".82rem",
              color: "var(--ti)",
              fontWeight: 700,
              marginBottom: ".55rem",
            }}
          >
            <input
              type="checkbox"
              checked={!!permissions[key]}
              onChange={() => togglePermission(key)}
              style={{ width: "auto", marginTop: ".15rem" }}
            />
            <span>
              {label}
              <br />
              <small style={{ fontWeight: 400, color: "var(--gr)" }}>{desc}</small>
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar cambios" : "Añadir al equipo"}
        </button>
        {editing && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar miembro
          </button>
        )}
      </div>
    </div>
  );
}
