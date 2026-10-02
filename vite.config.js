import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project from /equilog/ (nataliavilnov.github.io/equilog), so the
// production build needs that as its base — both for asset URLs and for the router's basename
// (App.jsx reads import.meta.env.BASE_URL). Dev stays at "/" so localhost:5173 works as before.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/equilog/" : "/",
  plugins: [react()],
}));
