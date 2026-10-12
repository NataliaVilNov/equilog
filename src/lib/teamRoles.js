// Roles del EQUIPO de la cuadra: quién es cada persona de puertas adentro. No confundir con
// members[uid].role del documento de la cuadra, que solo vale "admin" o "miembro" y es el que
// miran las reglas de Firestore. Este de aquí es descriptivo: no concede ni quita permisos,
// que siguen saliendo de las casillas de abajo del formulario.
//
// Los accesos de fuera (veterinario, herrador, propietario) no van por aquí: esa gente no
// forma parte del equipo y no debe aparecer en el calendario ni en las listas de asignación.
export const TEAM_ROLES = ["Gerente", "Mozo", "Profesor", "Jinete"];

// "Otro" no está en la lista de arriba a propósito: es el valor del desplegable que abre el
// campo de texto libre, no un rol que se guarde con ese nombre.
export const OTHER_ROLE = "__otro__";