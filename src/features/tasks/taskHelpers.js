// Ports taskNeedsReturn/taskStatusIcon/taskStatusLabel (public/legacy-app.js:3190-3204) and
// tfD/prog, renamed tasksForDate/dayProgress (public/legacy-app.js:1042-1043).

export function taskNeedsReturn(activity) {
  return activity === "paddock" || activity === "caminador";
}

export function taskStatusIcon(t) {
  if (taskNeedsReturn(t.activity)) {
    return { pending: "○", inprogress: "✓", done: "✓✓" }[t.status] || "○";
  }
  return t.status === "done" ? "✓" : "○";
}

export function taskStatusLabel(t) {
  if (taskNeedsReturn(t.activity)) {
    return { pending: "Pendiente", inprogress: "Llevado", done: "Recogido" }[t.status] || "Pendiente";
  }
  return t.status === "done" ? "Hecho" : "Pendiente";
}

export function tasksForDate(tasks, date) {
  return (tasks || []).filter((t) => t.date === date);
}

export function dayProgress(tasks, date) {
  const t = tasksForDate(tasks, date);
  if (!t.length) return { total: 0, done: 0, pct: 0 };
  const dn = t.filter((x) => x.status === "done").length;
  return { total: t.length, done: dn, pct: Math.round((dn / t.length) * 100) };
}
