# EquiLog para GitHub Pages

## Publicación

En GitHub deben verse directamente en la raíz del repositorio:

- `.github`
- `public`
- `src`
- `index.html`
- `package.json`
- `vite.config.js`

En **Settings → Pages → Source** selecciona **GitHub Actions**.

## Muy importante

En `.github/workflows` debe quedar únicamente el archivo `deploy.yml` incluido en este proyecto. Elimina workflows antiguos para evitar que GitHub ejecute configuraciones con `actions/checkout@v4` o `actions/upload-artifact@v4`.

Después abre **Actions → Publicar EquiLog → Run workflow** o sube un nuevo cambio para ejecutar la publicación.
