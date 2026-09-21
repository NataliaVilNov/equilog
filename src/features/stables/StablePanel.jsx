import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { ModalContext } from "../../contexts/ModalContext.jsx";
import { canManageStable } from "../../lib/permissions.js";
import { useToast } from "../../hooks/useToast.js";

// Ports the #stable-panel markup + openStablePanel/closeStablePanel, plus the
// delete/leave stable actions surfaced from it (index.html:106-119,
// public/legacy-app.js:701-724, 783-874).
export function StablePanel() {
  const { user } = useContext(AuthContext) || {};
  const { activeStable, deleteStable, leaveStable } = useContext(StableSelectionContext) || {};
  const { closeModal } = useContext(ModalContext) || {};
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!activeStable || !user) return null;

  const members = Object.entries(activeStable.members || {});
  const canManage = canManageStable(activeStable, user);

  function handleClose() {
    if (closeModal) closeModal("stablePanel");
  }

  function handleSwitch() {
    handleClose();
    navigate("/stables");
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar definitivamente la cuadra "${activeStable.name}"?\n\nSe borrará la cuadra activa y sus datos principales. Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await deleteStable();
      handleClose();
      showToast("Cuadra eliminada");
      navigate("/stables");
    } catch (err) {
      showToast("Error al eliminar: " + err.message);
    }
  }

  async function handleLeave() {
    if (
      !window.confirm(
        `¿Abandonar la cuadra "${activeStable.name}"?\n\nTu usuario perderá el acceso a la cuadra.\n\nSi estabas vinculado a un integrante del equipo, ese integrante quedará desvinculado para que el administrador pueda eliminarlo o volver a invitarlo.`
      )
    ) {
      return;
    }
    try {
      await leaveStable();
      handleClose();
      showToast("Has abandonado la cuadra y tu perfil de equipo quedó desvinculado");
      navigate("/stables");
    } catch (err) {
      showToast("Error al abandonar: " + err.message);
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
          <h2 style={{ fontSize: "1.1rem" }}>🏠 Cuadras</h2>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", fontSize: "1.3rem", color: "var(--gr)", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <div style={{ background: "var(--vl)", borderRadius: "12px", padding: ".85rem", marginBottom: ".75rem" }}>
          <div style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--vd)" }}>{activeStable.name}</div>
          {activeStable.description && (
            <div style={{ fontSize: ".75rem", color: "var(--gr)", marginTop: ".15rem" }}>
              {activeStable.description}
            </div>
          )}
          <div style={{ fontSize: ".72rem", color: "var(--v)", fontWeight: 700, marginTop: ".35rem" }}>
            {members.length} miembro{members.length !== 1 ? "s" : ""}
          </div>
          {members.map(([uid, m]) => (
            <div key={uid} style={{ fontSize: ".78rem", color: "#5C544A", marginTop: ".25rem" }}>
              {uid === user.uid ? (
                <b>
                  {m.name || m.email || ""} (tú) — {m.role || "miembro"}
                </b>
              ) : (
                `${m.name || m.email || ""} — ${m.role || "miembro"}`
              )}
            </div>
          ))}
        </div>
        <button className="btn btbl btg" onClick={handleSwitch} style={{ marginBottom: ".4rem", width: "100%" }}>
          ← Cambiar de cuadra
        </button>
        {canManage ? (
          <button className="btn btr btbl" onClick={handleDelete} style={{ marginBottom: ".4rem", width: "100%" }}>
            🗑️ Eliminar cuadra
          </button>
        ) : (
          <button className="btn btr btbl" onClick={handleLeave} style={{ marginBottom: ".4rem", width: "100%" }}>
            🚪 Abandonar cuadra
          </button>
        )}
        <p style={{ fontSize: ".7rem", color: "var(--gr)", lineHeight: 1.45, marginTop: ".35rem" }}>
          {canManage
            ? "Eliminar borra la cuadra actual y sus datos principales."
            : "Abandonar te quitará el acceso y desvinculará tu usuario del integrante del equipo."}
        </p>
      </div>
    </div>
  );
}
