import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { StableSelectionContext } from "../../contexts/StableSelectionContext.jsx";
import { ModalContext } from "../../contexts/ModalContext.jsx";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { td, fDL } from "../../lib/date.js";
import { tasksForDate, visibleTasksForUser } from "../tasks/taskHelpers.js";
import { upcomingHealthAlerts, pendingSessionAlerts, visibleAlertsForUser } from "../alerts/alertSelectors.js";
import { TaskCard } from "../tasks/TaskCard.jsx";
import { AlertCard } from "../alerts/AlertCard.jsx";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Ports greetingText (public/legacy-app.js:1190-1195).
function greetingText() {
  const hour = new Date().getHours();
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

// Ports rHome (public/legacy-app.js:1197-1247). Kept as one component rather than
// pre-split — its sections are small and tightly coupled; see docs/components/home.md.
// "Pizarras" (Phase 6) and "Más opciones" (no MorePanel yet) are forward-links, same
// deferred-link pattern used throughout this migration.
export function HomePage() {
  const { user, profile } = useContext(AuthContext) || {};
  const { activeStable } = useContext(StableSelectionContext) || {};
  const { openModal } = useContext(ModalContext) || {};
  const { tasks, horses, trainings, expenses, health, salerts } = useStableData();
  const { isAdmin, myTeamMember, can } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const today = td();
  const firstName = ((profile && profile.name) || (user && user.displayName) || "").trim().split(/\s+/)[0];
  const myMid = myTeamMember ? myTeamMember.id : null;

  const allToday = tasksForDate(tasks, today);
  const visibleToday = visibleTasksForUser(allToday, isAdmin, myMid);
  const done = visibleToday.filter((t) => t.status === "done").length;
  const pending = Math.max(0, visibleToday.length - done);
  const healthAlerts = can("health") ? upcomingHealthAlerts(health, horses) : [];
  const sessionAlerts = visibleAlertsForUser(pendingSessionAlerts(salerts), isAdmin, myMid);
  const pendingExpenses = can("expenses") ? expenses.filter((e) => e.status !== "pagado").length : 0;
  const workedIds = new Set(trainings.filter((t) => t.date === today).map((t) => t.hid));
  const totalHorses = horses.length;
  const nextHealth = healthAlerts.slice(0, 3);
  const urgent = healthAlerts.filter((a) => a.ov).length + sessionAlerts.length;
  const progress = visibleToday.length ? Math.round((done / visibleToday.length) * 100) : 0;

  return (
    <div className="view home-view">
      <section className="home-hero">
        <div>
          <span className="ey">{(activeStable && activeStable.name) || "EquiLog"}</span>
          <h1>
            {greetingText()}
            {firstName ? ", " + firstName : ""}
          </h1>
          <p>Este es el resumen de tu cuadra para hoy.</p>
        </div>
        <div className="home-date">{capitalize(fDL(today))}</div>
      </section>

      {urgent > 0 && (
        <button className="attention-card" onClick={() => navigate("/alerts")}>
          <span className="attention-icon">!</span>
          <span>
            <b>
              {urgent} aviso{urgent !== 1 ? "s" : ""} requiere{urgent === 1 ? "" : "n"} atención
            </b>
            <small>Revisa partes pendientes y controles sanitarios.</small>
          </span>
          <span>→</span>
        </button>
      )}

      <section className="home-stats">
        <button className="home-stat" onClick={() => navigate(`/day?d=${today}`)}>
          <span className="home-stat-icon task">✓</span>
          <strong>{pending}</strong>
          <small>Tareas pendientes</small>
        </button>
        <button className="home-stat" onClick={() => navigate("/horses")}>
          <span className="home-stat-icon horse">🐴</span>
          <strong>
            {workedIds.size}/{totalHorses}
          </strong>
          <small>Caballos trabajados</small>
        </button>
        <button className="home-stat" onClick={() => navigate("/alerts")}>
          <span className="home-stat-icon health">＋</span>
          <strong>{healthAlerts.length}</strong>
          <small>Controles próximos</small>
        </button>
        <button className="home-stat" onClick={() => navigate("/stats")}>
          <span className="home-stat-icon money">€</span>
          <strong>{pendingExpenses}</strong>
          <small>Pagos pendientes</small>
        </button>
      </section>

      <section className="home-section">
        <div className="section-title">
          <div>
            <span className="ey">Acciones rápidas</span>
            <h2>¿Qué necesitas hacer?</h2>
          </div>
        </div>
        <div className="quick-grid">
          {can("trainings") && horses.length > 0 && (
            <button
              className="quick-action primary"
              onClick={() => {
                navigate("/horses");
                showToast("Elige el caballo para registrar el entrenamiento");
              }}
            >
              <span>＋</span>
              <b>Entrenamiento</b>
              <small>Elegir caballo y registrar</small>
            </button>
          )}
          {can("tasks") && (
            <button className="quick-action" onClick={() => navigate(`/tasks/new?d=${today}`)}>
              <span>✓</span>
              <b>Nueva tarea</b>
              <small>Organizar el día</small>
            </button>
          )}
          {can("horses") && (
            <button className="quick-action" onClick={() => navigate("/horses/new")}>
              <span>🐴</span>
              <b>Nuevo caballo</b>
              <small>Añadir una ficha</small>
            </button>
          )}
          <button className="quick-action" onClick={() => navigate("/boards?tab=weekly")}>
            <span>▦</span>
            <b>Pizarras</b>
            <small>Plan semanal e instalaciones</small>
          </button>
          <button className="quick-action" onClick={() => openModal && openModal("morePanel")}>
            <span>•••</span>
            <b>Más opciones</b>
            <small>Salud, gastos y gestión</small>
          </button>
        </div>
      </section>

      <section className="home-section">
        <div className="section-title">
          <div>
            <span className="ey">Agenda</span>
            <h2>Tareas de hoy</h2>
          </div>
          <button className="text-link" onClick={() => navigate(`/day?d=${today}`)}>
            Ver todas →
          </button>
        </div>
        <div className="day-progress">
          <div>
            <b>
              {done} de {visibleToday.length}
            </b>
            <span> completadas</span>
          </div>
          <strong>{progress}%</strong>
          <div className="progress-track">
            <span style={{ width: progress + "%" }}></span>
          </div>
        </div>
        {visibleToday.length ? (
          visibleToday.slice(0, 4).map((t) => <TaskCard key={t.id} task={t} />)
        ) : (
          <div className="empty-soft">
            <span>✓</span>
            <div>
              <b>Todo tranquilo</b>
              <p>No hay tareas asignadas para hoy.</p>
            </div>
          </div>
        )}
      </section>

      {nextHealth.length > 0 && (
        <section className="home-section">
          <div className="section-title">
            <div>
              <span className="ey">Salud</span>
              <h2>Próximos controles</h2>
            </div>
            <button className="text-link" onClick={() => navigate("/alerts")}>
              Ver alertas →
            </button>
          </div>
          {nextHealth.map((a, i) => (
            <AlertCard key={i} alert={a} />
          ))}
        </section>
      )}
    </div>
  );
}
