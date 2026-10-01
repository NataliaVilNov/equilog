import { useContext } from "react";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { useToast } from "../../hooks/useToast.js";

// Ports #join-team-modal + showJoinTeamModal/closeJoinTeamModal/confirmJoinAs
// (index.html:76-94, public/legacy-app.js:561-637).
export function JoinTeamModal() {
  const { pendingJoin, cancelJoin, confirmJoinAs } = useContext(StableSelectionContext) || {};
  const { showToast } = useToast();

  if (!pendingJoin) return null;

  const team = pendingJoin.team || [];

  async function handleSelect(memberId, memberName) {
    try {
      const linkedName = await confirmJoinAs(memberId);
      showToast(
        memberId
          ? "Te has unido como " + (linkedName || memberName || "integrante")
          : "Te has unido a la cuadra"
      );
    } catch (err) {
      showToast("Error al vincularte: " + err.message);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 520,
        background: "rgba(44,41,37,.58)",
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
            marginTop: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: ".75rem",
              marginBottom: ".85rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: ".7rem",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--v)",
                  fontWeight: 800,
                }}
              >
                Invitación a cuadra
              </div>
              <h2 style={{ fontSize: "1.25rem", marginTop: ".12rem" }}>
                ¿Qué integrante del equipo eres?
              </h2>
              <p style={{ fontSize: ".82rem", color: "var(--gr)", marginTop: ".25rem", lineHeight: 1.45 }}>
                Ya tienes acceso a {(pendingJoin.stableData && pendingJoin.stableData.name) || "esta cuadra"}.
                Elige tu mote o perfil para que tus tareas queden vinculadas a tu usuario.
              </p>
            </div>
            <button
              onClick={cancelJoin}
              style={{ background: "none", border: "none", fontSize: "1.35rem", color: "var(--gr)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {!team.length ? (
            <div className="em" style={{ padding: "1rem .4rem" }}>
              <p>Esta cuadra todavía no tiene equipo creado. Puedes entrar sin vincular perfil.</p>
            </div>
          ) : (
            team.map((m) => {
              const linked = !!(m.uid || m.userId || m.authUid);
              return (
                <button
                  key={m.id}
                  className="mc"
                  disabled={linked}
                  onClick={() => handleSelect(m.id, m.name)}
                  style={{ width: "100%", opacity: linked ? 0.5 : 1, cursor: linked ? "not-allowed" : "pointer" }}
                >
                  <div className="av">{m.photo ? <img src={m.photo.url} alt="" /> : m.emoji || "👤"}</div>
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: ".94rem", color: "var(--ti)" }}>
                      {m.name || "Sin nombre"}
                    </div>
                    <div style={{ fontSize: ".75rem", color: "var(--gr)" }}>
                      {m.role || "Integrante del equipo"}
                    </div>
                    <span className={"ap " + (linked ? "ov" : "ok")}>
                      {linked ? "Ya vinculado" : "Soy este integrante"}
                    </span>
                  </div>
                  <span style={{ color: "var(--v)", fontSize: "1.15rem" }}>→</span>
                </button>
              );
            })
          )}
          <div style={{ marginTop: ".8rem", borderTop: "1px solid var(--li)", paddingTop: ".8rem" }}>
            <button className="btn btg btbl" style={{ width: "100%" }} onClick={() => handleSelect(null, null)}>
              Entrar sin vincular perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
