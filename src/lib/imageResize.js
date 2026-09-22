// Ports resizeProfileImageFile (public/legacy-app.js, deleted in the Phase 8c cutover —
// see git history at commit 8e74027~1 for the original). Profile photos are stored inline
// in the `users/{uid}` Firestore document (not Firebase Storage), so they're aggressively
// downscaled/recompressed here — unlike horse/team photos elsewhere in this app, which use
// plain FileReader with no resize (see docs/components/team.md, horses.md).
export function resizeProfileImageFile(file, maxSize = 160, quality = 0.58) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!file.type || !file.type.startsWith("image/")) return reject(new Error("El archivo no es una imagen"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let w = img.width || maxSize;
        let h = img.height || maxSize;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL("image/jpeg", quality);
        // Keeps the profile photo a very light thumbnail so it doesn't risk Firestore write limits.
        if (out.length > 70000) out = canvas.toDataURL("image/jpeg", 0.42);
        if (out.length > 70000) {
          const canvas2 = document.createElement("canvas");
          const scale2 = Math.min(1, 96 / Math.max(w, h));
          canvas2.width = Math.max(1, Math.round(w * scale2));
          canvas2.height = Math.max(1, Math.round(h * scale2));
          canvas2.getContext("2d").drawImage(img, 0, 0, canvas2.width, canvas2.height);
          out = canvas2.toDataURL("image/jpeg", 0.38);
        }
        if (out.length > 95000) return reject(new Error("La foto sigue siendo demasiado pesada. Prueba con otra imagen más pequeña."));
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
