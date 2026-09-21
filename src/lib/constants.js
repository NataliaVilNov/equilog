// Ports the static enum arrays at the top of public/legacy-app.js:4-9.
export const WK = [
  { id: "doma", l: "Doma", i: "🐎" },
  { id: "salto", l: "Salto", i: "🏇" },
  { id: "campo", l: "Campo", i: "🌳" },
  { id: "longe", l: "Cuerda", i: "🔄" },
  { id: "paseo", l: "Paseo", i: "🚶" },
];

export const HK = [
  { id: "herraje", l: "Herraje", i: "🔨" },
  { id: "vacuna", l: "Vacuna", i: "💉" },
  { id: "despar", l: "Despar.", i: "🧪" },
  { id: "otro", l: "Otro", i: "📋" },
];

export const AK = [
  { id: "monta", l: "Monta", i: "🐎", r: true },
  { id: "longe", l: "Longe", i: "🔄", r: true },
  { id: "trabajo_suave", l: "T.Suave", i: "🌿", r: true },
  { id: "paddock", l: "Paddock", i: "🟩", r: false },
  { id: "caminador", l: "Caminador", i: "🔁", r: false },
  { id: "paseo_mano", l: "Paseo de la mano", i: "🚶", r: false },
  { id: "bano", l: "Baño", i: "🚿", r: false },
  { id: "vet", l: "Veterinario", i: "🩺", r: false },
  { id: "herrador", l: "Herrador", i: "🔨", r: false },
  { id: "otro", l: "Otro", i: "📌", r: false },
];

export const EK = [
  { id: "vet", l: "Veterinario", i: "🩺", d: "out" },
  { id: "herrador", l: "Herrador", i: "🔨", d: "out" },
  { id: "pienso", l: "Pienso", i: "🌾", d: "out" },
  { id: "nomina", l: "Nómina", i: "💼", d: "out" },
  { id: "otro_g", l: "Otro gasto", i: "💸", d: "out" },
  { id: "otro_i", l: "Otro ingreso", i: "💰", d: "in" },
];

export const FK = [
  { id: "diaria", l: "Diaria", i: "📅" },
  { id: "semanal", l: "Semanal", i: "📆" },
  { id: "mensual", l: "Mensual", i: "🗓️" },
  { id: "puntual", l: "Puntual", i: "📌" },
];

export const EM = ["👩", "👨", "👩‍🦱", "👨‍🦱", "👩‍🦰", "👩‍🦳", "👨‍🦳", "🧑", "👩‍💼", "👨‍💼"];

export function workTypeById(id) {
  return WK.find((w) => w.id === id) || { l: id, i: "📋" };
}
export function healthTypeById(id) {
  return HK.find((h) => h.id === id) || { l: id, i: "📋" };
}
export function activityById(id) {
  return AK.find((a) => a.id === id) || { l: id, i: "📌", r: false };
}
export function expenseCategoryById(id) {
  return EK.find((e) => e.id === id) || { l: id, i: "💸", d: "out" };
}
