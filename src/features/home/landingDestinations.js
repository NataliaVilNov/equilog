// Curated set of destinations a user can pick as their post-login landing tab — a fixed
// list rather than an arbitrary route, so every option is guaranteed to render (no stale
// ids pointing at a deleted horse, no route needing a param this preference can't supply).
export const LANDING_DESTINATIONS = [
  { id: "home", label: "Inicio", route: "/home", isAvailable: () => true },
  { id: "day", label: "Hoy (tareas del día)", route: "/day", isAvailable: () => true },
  { id: "horses", label: "Caballos", route: "/horses", isAvailable: () => true },
  { id: "boards-weekly", label: "Pizarras · Semana", route: "/boards?tab=weekly", isAvailable: () => true },
  { id: "boards-month", label: "Pizarras · Mes", route: "/boards?tab=month", isAvailable: () => true },
  { id: "team", label: "Equipo", route: "/team", isAvailable: (ctx) => ctx.can("team") },
];

// Re-checks availability at resolve time (not just at save time), so a preference that's no
// longer reachable (e.g. the user lost the `team` permission after picking "Equipo") falls
// back to /home automatically instead of needing a migration/cleanup step.
export function resolveLandingRoute(landingId, ctx) {
  const dest = LANDING_DESTINATIONS.find((d) => d.id === landingId);
  if (!dest || !dest.isAvailable(ctx)) return "/home";
  return dest.route;
}
