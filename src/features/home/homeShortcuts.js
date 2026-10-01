// Catalog of HomePage's quick-action shortcuts. Pure config (no JSX, no Firestore) so both
// HomePage.jsx and the "Personalizar inicio" settings UI (UserPanel.jsx) read from the same
// source of truth. `ctx` carries whatever a caller needs (can, horses, navigate, showToast,
// openModal, today) rather than this module importing hooks itself, so it stays easy to call
// from both a component render and a settings form.
export const QUICK_ACTION_CATALOG = [
  {
    id: "trainings",
    icon: "＋",
    label: "Entrenamiento",
    sublabel: "Elegir caballo y registrar",
    primary: true,
    isAvailable: (ctx) => ctx.can("trainings") && ctx.horses.length > 0,
    onClick: (ctx) => {
      ctx.navigate("/horses");
      ctx.showToast("Elige el caballo para registrar el entrenamiento");
    },
  },
  {
    id: "tasks",
    icon: "✓",
    label: "Nueva tarea",
    sublabel: "Organizar el día",
    isAvailable: (ctx) => ctx.can("tasks"),
    onClick: (ctx) => ctx.navigate(`/tasks/new?d=${ctx.today}`),
  },
  {
    id: "horses",
    icon: "🐴",
    label: "Nuevo caballo",
    sublabel: "Añadir una ficha",
    isAvailable: (ctx) => ctx.can("horses"),
    onClick: (ctx) => ctx.navigate("/horses/new"),
  },
  {
    id: "boards",
    icon: "▦",
    label: "Pizarras",
    sublabel: "Plan semanal e instalaciones",
    isAvailable: () => true,
    onClick: (ctx) => ctx.navigate("/boards?tab=weekly"),
  },
  {
    id: "more",
    icon: "•••",
    label: "Más opciones",
    sublabel: "Salud, gastos y gestión",
    isAvailable: () => true,
    onClick: (ctx) => ctx.openModal && ctx.openModal("morePanel"),
    // Always shown, not user-toggleable — the one guaranteed way into profile/logout/
    // stable-switching/stats for anything the user didn't pin as a quick action.
    alwaysOn: true,
  },
];

// `enabledIds` is the user's saved `quickActions` preference (an array of ids) or
// null/undefined when they haven't customized anything yet, in which case every
// permission-available item shows — i.e. today's behavior, unchanged for existing users.
export function visibleQuickActions(ctx, enabledIds) {
  return QUICK_ACTION_CATALOG.filter((item) => {
    if (!item.isAvailable(ctx)) return false;
    if (item.alwaysOn) return true;
    if (!enabledIds) return true;
    return enabledIds.includes(item.id);
  });
}
