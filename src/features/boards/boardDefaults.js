// Ports boardDefaults() (public/legacy-app.js:1254-1288): the default shape for
// D.boardConfig the first time a stable has none. The "vet" activity was added later (not
// part of the original port) to back the weekly board's VET-flag-then-write-detail flow —
// see withDefaults() in StableDataContext.jsx for how existing stables get it backfilled.
export function boardDefaults() {
  return {
    activities: [
      { id: "monta", code: "M", label: "Montar", tone: "green" },
      { id: "paseo_mano", code: "PM", label: "Paseo de la mano", tone: "blue" },
      { id: "cuerda", code: "CR", label: "Cuerda", tone: "purple" },
      { id: "paddock", code: "P", label: "Paddock", tone: "amber" },
      { id: "caminador", code: "C", label: "Caminador", tone: "teal" },
      { id: "descanso", code: "D", label: "Descanso", tone: "gray" },
      { id: "vet", code: "VET", label: "Veterinario", tone: "red" },
    ],
    periodicColumns: [
      { id: "herraje", label: "Herraje", tone: "amber" },
      { id: "desparasitacion", label: "Desparasitación", tone: "green" },
      { id: "dientes", label: "Dientes", tone: "blue" },
    ],
    walkers: [
      {
        id: "walker_main",
        name: "Caminador principal",
        capacity: 4,
        slots: [
          { id: "w0800", start: "08:00", end: "09:00" },
          { id: "w0900", start: "09:00", end: "10:00" },
          { id: "w1700", start: "17:00", end: "18:00" },
        ],
      },
    ],
    paddocks: [
      { id: "paddock_1", name: "Paddock 1", capacity: 1 },
      { id: "paddock_2", name: "Paddock 2", capacity: 1 },
      { id: "paddock_3", name: "Paddock 3", capacity: 1 },
      { id: "paddock_4", name: "Paddock 4", capacity: 1 },
    ],
    paddockSlots: [
      { id: "p0830", start: "08:30", end: "10:30" },
      { id: "p1030", start: "10:30", end: "12:30" },
      { id: "p1230", start: "12:30", end: "13:30" },
      { id: "p1600", start: "16:00", end: "18:00" },
      { id: "p1800", start: "18:00", end: "20:00" },
    ],
  };
}
