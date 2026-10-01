import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { ModalContext } from "../../contexts/ModalContext.jsx";

// Ports the #main-header markup (index.html:96-105).
export function AppHeader() {
  const { user, profile } = useContext(AuthContext) || {};
  const { activeStable } = useContext(StableSelectionContext) || {};
  const { openModal } = useContext(ModalContext) || {};

  const userName = (profile && profile.name) || (user && user.displayName) || (user && user.email) || "";

  return (
    <header id="main-header">
      <div className="bar">
        <button
          className="logo"
          onClick={() => openModal && openModal("stablePanel")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: ".4rem", textAlign: "left" }}
        >
          EquiLog <span className="ltag">Beta</span>
          {activeStable && (
            <span
              style={{
                fontFamily: "Mulish,sans-serif",
                fontSize: ".6rem",
                fontWeight: 700,
                color: "var(--v)",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                border: "1px solid var(--v)",
                borderRadius: "999px",
                padding: ".08rem .4rem",
              }}
            >
              {activeStable.name}
            </span>
          )}
        </button>
        <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
          <span style={{ fontSize: ".68rem", color: "var(--gr)", fontWeight: 600 }}>{userName}</span>
          <button className="ib" onClick={() => openModal && openModal("userPanel")} title="Mi perfil">
            👤
          </button>
        </div>
      </div>
    </header>
  );
}
