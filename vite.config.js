import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Rutas relativas: funciona en cualquier repositorio de GitHub Pages.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        reactApp: resolve(__dirname, "react-app.html"),
      },
    },
  },
});
