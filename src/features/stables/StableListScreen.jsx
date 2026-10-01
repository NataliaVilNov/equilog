import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { logout } from "../auth/authActions.js";
import { JoinByCodeForm } from "./JoinByCodeForm.jsx";
import { CreateStableModal } from "./CreateStableModal.jsx";
import { resolveLandingRoute } from "../home/landingDestinations.js";

// Ports the #stable-screen markup + renderStableList()
// (index.html:43-65, public/legacy-app.js:334-365).
export function StableListScreen() {
  const { user, profile } = useContext(AuthContext) || {};
  const { stables, activeStableId, loading, error, refreshStables, switchStable } =
    useContext(StableSelectionContext) || {};
  const { can } = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (refreshStables) refreshStables();
  }, [refreshStables]);

  // Legacy's render() reacted globally the moment _fbSwitchStable set an active stable,
  // however that happened (picking one, creating one, joining by code). This is the React
  // equivalent: leave for the user's preferred landing tab as soon as activeStableId becomes
  // non-null, regardless of which action in this screen (or a child modal) caused it, rather
  // than wiring a navigate() call into every individual handler. This fires for BOTH a manual
  // pick here and a returning user's stable auto-selected from their saved `lastStable` (see
  // StableSelectionContext's autoSelectedForUid effect) — ProtectedRoute routes every signed-in
  // session through here until a stable is active, so this is the one universal "a fresh
  // session just got a stable" moment, making it the right place to resolve the landing
  // preference rather than the routes.jsx catch-all (which only ever fires once a stable is
  // already active, i.e. mid-session, not on a fresh app open).
  useEffect(() => {
    if (activeStableId) navigate(resolveLandingRoute(profile && profile.landingRoute, { can }));
  }, [activeStableId, navigate, profile, can]);

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
