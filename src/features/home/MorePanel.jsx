import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ModalContext } from "../../contexts/ModalContext.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";

// Ports the #more-panel markup + openMorePanel/closeMorePanel
// (index.html:140-145, public/legacy-app.js:1470-1488). This was sketched in the original
// target folder layout (docs/REFACTOR_PLAN.md §2) but never assigned to a migration phase,
// so its trigger buttons (BottomNav's "Más", HomePage's "Más opciones") called
// openModal("morePanel") into a void with no listener the whole migration.
export function MorePanel() {
  const { openModal, closeModal } = useContext(ModalContext) || {};
  const { can } = usePermissions();
  const navigate = useNavigate();

  function handleClose() {
    if (closeModal) closeModal("morePanel");
  }

  function goTo(path) {
    handleClose();
    navigate(path);
  }

  function openPanel(key) {
    handleClose();
    if (openModal) openModal(key);
  }

  const items = [
    { icon: "▦", title: "Pizarras", sub: "Plan semanal, caminador y paddocks", onClick: () => goTo("/boards?tab=weekly") },
    can("stable") && {
      icon: "🏠",
      title: "Cuadra",
      sub: "Tareas y gastos generales",
      onClick: () => goTo("/cuadra?tab=tareas"),
    },
    { icon: "🔔", title: "Alertas", sub: "Avisos y recordatorios", onClick: () => goTo("/alerts") },
    can("stats") && { icon: "▥", title: "Estadísticas", sub: "Actividad y finanzas", onClick: () => goTo("/stats") },
    { icon: "👤", title: "Mi perfil", sub: "Datos personales y sesión", onClick: () => openPanel("userPanel") },
    { icon: "⇄", title: "Cambiar de cuadra", sub: "Abrir otra cuadra", onClick: () => openPanel("stablePanel") },
  ].filter(Boolean);

  return (
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section className="sheet" aria-label="Más opciones">
        <div className="sheet-head">
          <div>
            <span className="ey">EquiLog</span>
            <h2>Más opciones</h2>
          </div>
          <button className="ib" onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="more-grid">
          {items.map((item) => (
            <button key={item.title} className="more-item" onClick={item.onClick}>
              <span>{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.sub}</small>
              </div>
              <i>→</i>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
