export function td() {
  return new Date().toISOString().slice(0, 10);
}

export function addD(s, n) {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fD(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fDL(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function dU(s) {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((new Date(s + "T12:00:00") - n) / 86400000);
}
