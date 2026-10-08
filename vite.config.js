import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves this project from /equilog/ (nataliavilnov.github.io/equilog), so the
// production build needs that as its base — both for asset URLs and for the router's basename
// (App.jsx reads import.meta.env.BASE_URL). Dev stays at "/" so localhost:5173 works as before.
export default defineConfig(({ command }) => {
  const base = command === "build" ? "/equilog/" : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["apple-touch-icon.png"],
        manifest: {
          name: "EquiLog — Gestión de cuadra",
          short_name: "EquiLog",
          description:
            "Pizarras de cuadra: caballos, caminadores y paddocks.",
          lang: "es",
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: "#4a5d3a",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "icon-512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: `${base}index.html`,
          // Firebase + jsPDF generan bundles grandes; el límite por defecto (2 MiB) se queda corto.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  };
});
