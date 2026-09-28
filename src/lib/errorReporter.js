// Lets plain (non-React) modules like firestoreCollections.js surface a write failure to the
// user, without importing React context machinery into a lib file. ToastProvider registers
// itself as the handler on mount; until then (or if it's ever unmounted) failures still land
// in the console instead of vanishing silently.
let handler = null;

export function registerErrorReporter(fn) {
  handler = fn;
}

export function reportWriteError(err) {
  console.error("Firestore write failed:", err);
  if (handler) handler("Error guardando los cambios. Vuelve a intentarlo.");
}
