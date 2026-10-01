import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Rutas relativas: funciona en cualquier repositorio de GitHub Pages.
  base: "./",
  plugins: [react()],
});
