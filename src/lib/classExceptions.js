// Excepciones puntuales al horario semanal de clases (boardConfig.classExceptions). El
// horario fijo vive en classSlots y no se toca: aquí solo se guarda lo que se sale de la
// norma un día concreto — un festivo, una clase anulada, una clase movida a otro día.
//
// Cada excepción es una de estas tres formas:
//   { id, kind: "off",  date, slotId: null, reason }  → ese día no hay ninguna clase
//   { id, kind: "off",  date, slotId, reason }        → esa clase concreta no se da
//   { id, kind: "move", date, slotId, toDate, toStart, toEnd, reason } → se pasa a otro día

// Día de la semana de una fecha "YYYY-MM-DD" en el formato de classSlots (1=lunes…7=domingo).
export function weekdayOf(date) {
  const d = new Date(`${date}T12:00:00`).getDay();
  return d === 0 ? 7 : d;
}

// La excepción de día completo, si la hay.
export function dayOffOn(classExceptions, date) {
  return (classExceptions || []).find((e) => e.kind === "off" && e.date === date && !e.slotId) || null;
}

// La excepción de una clase concreta ese día, si la hay.
export function exceptionFor(classExceptions, date, slotId) {
  return (classExceptions || []).find((e) => e.date === date && e.slotId === slotId) || null;
}

// Las clases reales de un día: las del horario semanal (anuladas o no) más las que vienen
// movidas de otro día. Cada entrada lleva su estado para que la UI solo tenga que pintarlo.
//   { slot, start, end, cancelled, reason, movedTo, movedFrom }
export function classesOnDate(classSlots, classExceptions, date) {
  const exs = classExceptions || [];
  const dayOff = dayOffOn(exs, date);
  const wd = weekdayOf(date);
  const list = [];

  (classSlots || []).forEach((slot) => {
    if (Number(slot.weekday) !== wd) return;
    const ex = exceptionFor(exs, date, slot.id);
    if (ex && ex.kind === "move") {
      list.push({
        slot,
        start: slot.start,
        end: slot.end,
        cancelled: true,
        movedTo: ex.toDate,
        reason: ex.reason || "",
      });
      return;
    }
    list.push({
      slot,
      start: slot.start,
      end: slot.end,
      cancelled: !!dayOff || !!ex,
      reason: (ex && ex.reason) || (dayOff && dayOff.reason) || "",
    });
  });

  exs
    .filter((e) => e.kind === "move" && e.toDate === date)
    .forEach((e) => {
      const slot = (classSlots || []).find((s) => s.id === e.slotId);
      if (!slot) return;
      list.push({
        slot,
        start: e.toStart || slot.start,
        end: e.toEnd || slot.end,
        cancelled: !!dayOff,
        movedFrom: e.date,
        reason: e.reason || "",
      });
    });

  list.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  return list;
}