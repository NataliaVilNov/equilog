import "./styles.css";

function showStartupError(message) {
  console.error(message);
  const loading = document.getElementById("loading-screen");
  if (loading) loading.style.display = "none";

  const auth = document.getElementById("auth-screen");
  if (auth) auth.style.display = "block";

  const err = document.getElementById("auth-err");
  if (err) {
    err.textContent = message;
    err.style.display = "block";
  }
}

window.addEventListener("error", (event) => {
  console.error("Error global de EquiLog:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promesa rechazada en EquiLog:", event.reason);
});

// Carga Firebase después de que la aplicación antigua haya definido sus funciones globales.
import("./firebase.js").catch((error) => {
  showStartupError(
    "EquiLog no ha podido iniciar Firebase. Recarga la página. Si continúa, revisa la publicación de GitHub Pages."
  );
  console.error(error);
});

// Evita una pantalla completamente en blanco o bloqueada si Firebase no responde.
setTimeout(() => {
  const loading = document.getElementById("loading-screen");
  const auth = document.getElementById("auth-screen");
  const stable = document.getElementById("stable-screen");
  const header = document.getElementById("main-header");

  const stillLoading = loading && loading.style.display === "flex";
  const noVisibleScreen =
    (!auth || auth.style.display === "none") &&
    (!stable || stable.style.display === "none") &&
    (!header || header.style.display === "none");

  if (stillLoading && noVisibleScreen) {
    showStartupError(
      "La aplicación está tardando demasiado en iniciar. Recarga la página y comprueba que GitHub haya publicado la última versión."
    );
  }
}, 15000);
