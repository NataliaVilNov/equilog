import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";
import { tasksForDate } from "../tasks/taskHelpers.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { Fab } from "../../components/layout/Fab.jsx";

// Ports rTeam (public/legacy-app.js:3279-3297). The FAB (add member) matches render()'s
// `canPerm('team') && nm==="team"` fab block (public/legacy-app.js ~1531) — implicit here
// since /team is already gated by PermissionRoute("team").
export function TeamPage() {
  const { team, tasks } = useStableData();
  const { createMemberInvite } = useContext(StableSelectionContext) || {};
  const { showToast } = useToast();
  const navigate = useNavigate();

  const today = td();
  const todaysTasks = tasksForDate(tasks, today);

  async function handleInvite(member) {
    const linked = !!(member.uid || member.userId || member.authUid);
    if (
      linked &&
      !window.confirm(`${member.name} ya parece vinculado a un usuario. ¿Crear otro código igualmente?`)
    ) {
      return;
    }
    try {
      const code = await createMemberInvite(member);
      try {
        await navigator.clipboard.writeText(code);
        showToast("Código copiado para " + member.name + ": " + code);
      } catch (_e) {
        showToast("Código para " + member.name + ": " + code);
      }
    } catch (err) {
      showToast("Error creando invitación: " + err.message);
    }
  }

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">Equipo</span>
          <h1>Mi equipo</h1>
        </div>
        <div className="vhr">
          <button className="btn btsm btg" onClick={() => navigate("/team/calendar")}>
            📅 Calendario
          </button>
          <button className="btn btsm btg" onClick={() => navigate("/team/report")}>
            📊 Informe
          </button>
          <button className="btn btsm" onClick={() => navigate("/templates")}>
            📋 Plantillas
          </button>
        </div>
      </div>
      {!team.length ? (
        <EmptyState icon="👥">
          Sin miembros.
          <br />
          Pulsa <b>+</b>.
        </EmptyState>
      ) : (
        team.map((m) => {
          const mt = todaysTasks.filter((t) => t.assignedTo === m.id);
          const dn = mt.filter((t) => t.status === "done").length;
          const linked = !!(m.uid || m.userId || m.authUid);
          return (
            <div className="mc" key={m.id} style={{ cursor: "default" }}>
              <div
                className="av"
                onClick={() => navigate(`/team/${m.id}/day?d=${today}`)}
                style={{ cursor: "pointer" }}
              >
                {m.photo ? <img src={m.photo} alt="" /> : m.emoji || "👤"}
              </div>
              <div
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => navigate(`/team/${m.id}/day?d=${today}`)}
              >
                <div style={{ fontWeight: 700, fontSize: ".93rem" }}>{m.name}</div>
                <div style={{ fontSize: ".76rem", color: "var(--gr)" }}>{m.role || ""}</div>
                {linked ? <span className="ap ok">🔗 Usuario vinculado</span> : <span className="ap">Sin usuario</span>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--az)",
                  }}
                >
                  {dn}/{mt.length}
                </div>
                <div
                  style={{
                    fontSize: ".58rem",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--gr)",
                    marginBottom: ".25rem",
                  }}
                >
                  Hoy
                </div>
                <div style={{ display: "flex", gap: ".25rem", justifyContent: "flex-end" }}>
                  <button className="btn btsm btg" onClick={() => handleInvite(m)}>
                    Invitar
                  </button>
                  <button className="btn btsm" onClick={() => navigate(`/team/${m.id}/edit`)}>
                    Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      <Fab onClick={() => navigate("/team/new")} />
    </div>
  );
}
