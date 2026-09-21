import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { logout } from "../auth/authActions.js";
import { JoinByCodeForm } from "./JoinByCodeForm.jsx";
import { CreateStableModal } from "./CreateStableModal.jsx";

// Ports the #stable-screen markup + renderStableList()
// (index.html:43-65, public/legacy-app.js:334-365).
export function StableListScreen() {
  const { user, profile } = useContext(AuthContext) || {};
  const { stables, loading, error, refreshStables, switchStable } =
    useContext(StableSelectionContext) || {};
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (refreshStables) refreshStables();
  }, [refreshStables]);

  const userName =
    (profile && profile.name) || (user && user.displayName) || (user && user.email) || "";

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "1.5rem 1rem 5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--ti)",
            }}
          >
            Mis cuadras
          </div>
          <div style={{ fontSize: ".78rem", color: "var(--gr)" }}>{userName}</div>
        </div>
        <button className="btn btg btsm" onClick={() => logout()}>
          Salir
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "var(--gr)", padding: "1rem" }}>
          Cargando...
        </div>
      )}
      {error && (
        <div style={{ color: "var(--ro)", fontSize: ".82rem", padding: ".5rem" }}>
          {error.message}
        </div>
      )}
      {!loading && stables && stables.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--gr)", padding: "1.5rem 0" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: ".5rem" }}>🏠</div>
          <p style={{ fontSize: ".86rem" }}>
            Aún no perteneces a ninguna cuadra.
            <br />
            Crea una o únete con un código.
          </p>
        </div>
      )}
      {stables && stables.length > 0 && (
        <div>
          {stables.map((s) => {
            const myRole =
              s.members && user && s.members[user.uid] ? s.members[user.uid].role : "miembro";
            const count = s.memberIds ? s.memberIds.length : 1;
            return (
              <button
                key={s.id}
                onClick={() => switchStable(s.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: ".75rem",
                  background: "#fff",
                  border: "1.5px solid var(--li)",
                  borderRadius: "13px",
                  padding: ".85rem",
                  marginBottom: ".55rem",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "var(--vl)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    flexShrink: 0,
                  }}
                >
                  🏠
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--ti)" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--gr)", marginTop: ".07rem" }}>
                    {count} miembro{count !== 1 ? "s" : ""} · {myRole}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: ".72rem", color: "var(--gr)" }}>{s.description}</div>
                  )}
                </div>
                <span style={{ color: "var(--v)", fontSize: "1.1rem" }}>→</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--li)", paddingTop: "1rem" }}>
        <JoinByCodeForm />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <button className="btn btbl" style={{ width: "100%" }} onClick={() => setShowCreate(true)}>
          + Crear nueva cuadra
        </button>
      </div>

      {showCreate && <CreateStableModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
