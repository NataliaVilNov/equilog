import { useContext, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { ModalContext } from "../../contexts/ModalContext.jsx";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";
import { activityById } from "../../lib/constants.js";
import { resizeProfileImageFile } from "../../lib/imageResize.js";
import { updateUserProfile, updateHomePreferences, logout } from "../auth/authActions.js";
import { QUICK_ACTION_CATALOG } from "../home/homeShortcuts.js";
import { LANDING_DESTINATIONS } from "../home/landingDestinations.js";

function profilePhoto(profile, user) {
  return (profile && (profile.photo || profile.avatar)) || (user && user.photoURL) || "";
}
function profileInitial(profile, user) {
  const n = (profile && profile.name) || (user && user.displayName) || (user && user.email) || "?";
  return String(n).trim().charAt(0).toUpperCase() || "?";
}

// Ports the #user-panel markup + openUserPanel/saveUserProfile/previewUserProfilePhoto/
// removeUserProfilePhoto/renderMyDayTasks (index.html:120-129, public/legacy-app.js,
// deleted in the Phase 8c cutover — see git history at commit 8e74027~1). This was
// sketched in the original target folder layout (docs/REFACTOR_PLAN.md §2) but never
// assigned to a migration phase, so its trigger buttons (AppHeader's 👤, MorePanel's "Mi
// perfil") called openModal("userPanel") into a void with no listener the whole
// migration — including logout, which has no other entry point inside the app.
export function UserPanel() {
  const { user, profile, applyProfileUpdate } = useContext(AuthContext) || {};
  const { activeStable } = useContext(StableSelectionContext) || {};
  const { closeModal } = useContext(ModalContext) || {};
  const { tasks, horses } = useStableData();
  const { can, myTeamMember } = usePermissions();
  const { showToast } = useToast();

  const [name, setName] = useState((profile && profile.name) || (user && user.displayName) || "");
  const [phone, setPhone] = useState((profile && profile.phone) || "");
  const [bio, setBio] = useState((profile && profile.bio) || "");
  const [photo, setPhoto] = useState(profilePhoto(profile, user));
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);

  const homeCtx = { can, horses };
  const toggleableShortcuts = QUICK_ACTION_CATALOG.filter((item) => !item.alwaysOn);
  const [landingRoute, setLandingRoute] = useState((profile && profile.landingRoute) || "home");
  const [enabledShortcuts, setEnabledShortcuts] = useState(
    () =>
      (profile && profile.quickActions) ||
      toggleableShortcuts.filter((item) => item.isAvailable(homeCtx)).map((item) => item.id)
  );
  const [savingHome, setSavingHome] = useState(false);

  if (!user) return null;

  const myRole =
    activeStable && activeStable.members && activeStable.members[user.uid]
      ? activeStable.members[user.uid].role
      : "miembro";

  const today = td();
  const myTasks = myTeamMember
    ? tasks.filter((t) => t.startDate === today && t.assignedTo === myTeamMember.id)
    : [];

  function handleClose() {
    if (closeModal) closeModal("userPanel");
  }

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPreparingPhoto(true);
    try {
      const dataUrl = await resizeProfileImageFile(file, 160, 0.58);
      setPhoto(dataUrl);
      showToast("Foto lista para guardar");
    } catch (err) {
      showToast("Error con la foto: " + err.message);
    } finally {
      setPreparingPhoto(false);
      e.target.value = "";
    }
  }

  function handleRemovePhoto() {
    setPhoto("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateUserProfile(user, profile || {}, { name, phone, bio, photo });
      if (applyProfileUpdate) applyProfileUpdate(result.profile);
      if (result.photoDropped) showToast("Perfil guardado sin foto. La imagen pesaba demasiado.");
      else showToast("Perfil actualizado");
      handleClose();
    } catch (err) {
      showToast("Error al guardar perfil: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    handleClose();
    await logout();
  }

  function toggleShortcut(id) {
    setEnabledShortcuts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSaveHomePrefs() {
    setSavingHome(true);
    try {
      const result = await updateHomePreferences(user, profile || {}, { landingRoute, quickActions: enabledShortcuts });
      if (applyProfileUpdate) applyProfileUpdate(result);
      showToast("Preferencias de inicio guardadas");
    } catch (err) {
      showToast("Error al guardar: " + err.message);
    } finally {
      setSavingHome(false);
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(44,41,37,.55)", backdropFilter: "blur(3px)" }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--fo)",
          borderRadius: "18px 18px 0 0",
          padding: "1.2rem 1rem 2rem",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>👤 Mi perfil</h2>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", fontSize: "1.3rem", color: "var(--gr)", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1.2rem" }}>
          <div
            style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              background: "var(--vl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.55rem",
              fontWeight: 700,
              color: "var(--vd)",
              overflow: "hidden",
              border: "2px solid var(--li)",
              flexShrink: 0,
            }}
          >
            {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profileInitial(profile, user)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{(profile && profile.name) || user.displayName || ""}</div>
            <div style={{ fontSize: ".75rem", color: "var(--gr)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
            <div style={{ fontSize: ".68rem", color: "var(--v)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginTop: ".15rem" }}>
              {myRole}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: ".75rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--gr)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: ".65rem" }}>
            Editar mi perfil
          </div>
          <div className="f">
            <label>Foto de perfil</label>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
              <label className="fl">
                {preparingPhoto ? "Preparando..." : "Elegir foto"}
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} disabled={preparingPhoto} />
              </label>
              {photo && (
                <button type="button" className="btn btg btsm" onClick={handleRemovePhoto}>
                  Quitar foto
                </button>
              )}
            </div>
            <div style={{ fontSize: ".68rem", color: "var(--gr)", marginTop: ".35rem" }}>
              La foto se reduce automáticamente para que pueda guardarse correctamente.
            </div>
          </div>
          <div className="f">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="f">
            <label>Teléfono / contacto</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="f">
            <label>Notas personales</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Opcional" />
          </div>
          <button className="btn bts btbl" onClick={handleSave} disabled={saving}>
            Guardar perfil
          </button>
        </div>

        <div className="card" style={{ marginBottom: ".75rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--gr)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: ".65rem" }}>
            Personalizar inicio
          </div>
          <div className="f">
            <label>Pantalla de inicio</label>
            <select value={landingRoute} onChange={(e) => setLandingRoute(e.target.value)}>
              {LANDING_DESTINATIONS.filter((d) => d.isAvailable(homeCtx)).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: ".68rem", color: "var(--gr)", marginTop: ".35rem" }}>
              La pantalla a la que irás al abrir la app.
            </div>
          </div>
          <div className="f">
            <label>Accesos rápidos en Inicio</label>
            {toggleableShortcuts
              .filter((item) => item.isAvailable(homeCtx))
              .map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".55rem",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: ".82rem",
                    color: "var(--ti)",
                    fontWeight: 700,
                    marginTop: ".5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enabledShortcuts.includes(item.id)}
                    onChange={() => toggleShortcut(item.id)}
                    style={{ width: "auto" }}
                  />
                  <span>
                    {item.icon} {item.label}
                  </span>
                </label>
              ))}
          </div>
          <button className="btn bts btbl" onClick={handleSaveHomePrefs} disabled={savingHome}>
            Guardar preferencias de inicio
          </button>
        </div>

        <div className="card" style={{ marginBottom: ".75rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--gr)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: ".5rem" }}>
            Mi agenda de hoy
          </div>
          {!myTasks.length ? (
            <div style={{ fontSize: ".82rem", color: "var(--gr)" }}>Sin tareas asignadas hoy.</div>
          ) : (
            myTasks.map((t) => {
              const h = horses.find((x) => x.id === t.horseId);
              const a = activityById(t.activity || "monta");
              const isDone = t.status === "done";
              return (
                <div
                  key={t.id}
                  style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".42rem 0", borderBottom: "1px solid var(--li)" }}
                >
                  <span style={{ fontSize: "1rem" }}>{a.i}</span>
                  <div style={{ flex: 1, fontSize: ".82rem", textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--gr)" : "inherit" }}>
                    {a.l}
                    {h ? " · " + h.name : ""}
                    <div style={{ fontSize: ".72rem", color: "var(--gr)" }}>
                      {t.time || ""} {t.dur ? t.dur + "min" : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: ".68rem", fontWeight: 700, color: isDone ? "var(--v)" : "var(--am)" }}>{isDone ? "✓" : "⏳"}</span>
                </div>
              );
            })
          )}
        </div>

        <button className="btn btr btbl" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
