// Ports fbErrMsg (public/legacy-app.js:58-61).
const MESSAGES = {
  "auth/invalid-email": "Email inválido",
  "auth/user-not-found": "Usuario no encontrado",
  "auth/wrong-password": "Contraseña incorrecta",
  "auth/email-already-in-use": "Este email ya está registrado",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-credential": "Email o contraseña incorrectos",
};

export function authErrorMessage(error) {
  if (!error) return "Error desconocido";
  if (!error.code) return error.message || "Error desconocido";
  return MESSAGES[error.code] || "Error: " + error.code;
}
