import { td, addD } from "./date.js";

// Cada cuántos días toca repetir cada cuidado. El herraje depende del caballo (entre 4 y 6
// semanas según cómo gaste cada uno), así que su valor aquí es solo el de partida: la ficha
// del caballo puede llevar el suyo en `shoeingDays`.
export const HEALTH_CYCLE_DAYS = {
  herraje: 35,
  despar: 182,
  vacuna: 182,
  dientes: 365,
};

// Con cuántos días de antelación empieza a avisar, para que dé tiempo a llamar al herrador o
// al veterinario antes de que se pase la fecha.
const WARN_DAYS = 7;

// Días entre dos fechas "YYYY-MM-DD". Positivo si `b` es posterior a `a`.
export function daysBetween(a, b) {
  const ms = new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`);
  return Math.round(ms / 86400000);
}

// El ciclo que aplica a un caballo para un tipo de cuidado. Solo el herraje admite valor
// propio por caballo; el resto es igual para todos.
export function cycleDaysFor(horse, type) {
  if (type === "herraje" && horse && Number(horse.shoeingDays) > 0) {
    return Number(horse.shoeingDays);
  }
  return HEALTH_CYCLE_DAYS[type] || 0;
}

// El último registro de ese tipo para ese caballo, o null si nunca se ha apuntado.
export function lastRecord(health, hid, type) {
  return (health || [])
    .filter((r) => r.hid === hid && r.type === type && r.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// Un aviso por caballo y tipo de cuidado, para los que ya tocan o están a punto.
//
// La fecha prevista sale de dos sitios, por este orden:
//   1. El `nxt` del último registro, si quien lo apuntó puso fecha concreta. Manda siempre:
//      es una decisión humana, no una estimación.
//   2. La fecha del último registro más el ciclo del tipo.
//
// Devuelve { hid, horseName, type, due, days, overdue, never } ordenado por urgencia.
// `days` es lo que falta (negativo si ya se pasó) y `never` marca los caballos sin ningún
// registro de ese tipo: no se puede calcular nada, pero conviene saberlo.
export function healthAlerts(horses, health, { types, today } = {}) {
  const day = today || td();
  const kinds = types || Object.keys(HEALTH_CYCLE_DAYS);
  const alerts = [];

  (horses || []).forEach((horse) => {
    kinds.forEach((type) => {
      const last = lastRecord(health, horse.id, type);
      if (!last) {
        alerts.push({
          hid: horse.id,
          horseName: horse.name,
          type,
          due: null,
          days: null,
          overdue: false,
          never: true,
        });
        return;
      }
      const due = last.nxt || addD(last.date, cycleDaysFor(horse, type));
      const days = daysBetween(day, due);
      if (days > WARN_DAYS) return;
      alerts.push({
        hid: horse.id,
        horseName: horse.name,
        type,
        due,
        days,
        lastDate: last.date,
        overdue: days < 0,
        never: false,
      });
    });
  });

  // Lo más atrasado primero; los que no tienen histórico, al final.
  alerts.sort((a, b) => {
    if (a.never !== b.never) return a.never ? 1 : -1;
    if (a.never) return (a.horseName || "").localeCompare(b.horseName || "", "es");
    return a.days - b.days;
  });
  return alerts;
}

// Frase corta para la tarjeta: "Lleva 6 semanas herrado", "Toca en 3 días".
export function alertText(alert) {
  if (alert.never) return "Sin histórico";
  const d = alert.days;
  if (alert.type === "herraje" && alert.lastDate) {
    const weeks = Math.floor(daysBetween(alert.lastDate, td()) / 7);
    if (d < 0) return `Lleva ${weeks} semanas herrado`;
    return weeks >= 1 ? `Lleva ${weeks} semanas herrado` : "Toca esta semana";
  }
  if (d < 0) return d === -1 ? "Se pasó ayer" : `Se pasó hace ${-d} días`;
  if (d === 0) return "Toca hoy";
  if (d === 1) return "Toca mañana";
  return `Toca en ${d} días`;
}