// Tipos de colaborador: gente que trabaja con la cuadra de forma ocasional y que NO forma
// parte del equipo. No son miembros de la cuadra (no salen en memberIds ni en la lista de
// miembros del panel) y no tienen ficha en team, así que no aparecen en el calendario de
// equipo ni en las listas de asignar tareas.
//
// Hoy solo el veterinario llega a tener permisos de verdad. Los demás se pueden crear y
// guardar, pero su acceso no abre nada hasta que se escriban sus reglas.
export const COLLABORATOR_TYPES = [
  { id: "vet", label: "Veterinario", ready: true },
  { id: "farrier", label: "Herrador", ready: false },
  { id: "physio", label: "Fisioterapeuta", ready: false },
  { id: "owner", label: "Propietario", ready: false },
  { id: "other", label: "Otro", ready: false },
];

export function collaboratorTypeLabel(id) {
  const t = COLLABORATOR_TYPES.find((x) => x.id === id);
  return t ? t.label : "Colaborador";
}

// El id de un documento de access. Determinista a propósito: así la regla de Firestore puede
// ir a la ruta exacta en vez de buscar por campos, que es algo que no sabe hacer.
export function accessDocId(stableId, uid) {
  return `${stableId}__${uid}`;
}

// Mientras la invitación está pendiente no existe uid todavía, así que el documento se
// nombra con el código de invitación. Al aceptarse se crea el definitivo con el uid real.
export function pendingAccessDocId(code) {
  return `pending__${code}`;
}