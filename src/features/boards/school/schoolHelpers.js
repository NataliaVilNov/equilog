// Los siete tonos de la pizarra, repartidos entre los profesores por orden estable: el
// color de un profesor no cambia al añadir otro, porque depende de su posicion en el
// equipo, no del numero de profesores que haya.
const TONES = ["green", "blue", "amber", "red", "purple", "teal", "gray"];

export function teacherTone(team, teacherId) {
  if (!teacherId) return "gray";
  const i = team.findIndex((m) => m.id === teacherId);
  return i === -1 ? "gray" : TONES[i % TONES.length];
}

export function teacherName(team, teacherId) {
  const m = team.find((x) => x.id === teacherId);
  return m ? m.name : "";
}

// "Ponis · Marta", o lo que haya de los dos. Sin ninguno, la hora identifica la clase.
export function slotLabel(slot, team) {
  const name = teacherName(team, slot.teacherId);
  return [slot.groupName, name].filter(Boolean).join(" · ");
}