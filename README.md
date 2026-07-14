# EquiLog — versión modular con Vite

Esta carpeta es la primera migración segura del archivo HTML monolítico a una estructura Vite.

## Estructura actual

- `index.html`: estructura principal de la aplicación.
- `src/styles.css`: todos los estilos extraídos del HTML original.
- `src/firebase.js`: configuración, inicialización y exportación de Firebase.
- `src/main.js`: punto de entrada de Vite.
- `src/legacy-app.js`: lógica original conservada temporalmente para no romper funcionalidades.

## Cómo ejecutarla

Necesitas Node.js instalado. Desde esta carpeta ejecuta:

```bash
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente `http://localhost:5173`.

Para generar la versión publicable:

```bash
npm run build
```

El resultado aparecerá en la carpeta `dist`.

## Siguiente fase recomendada

Extraer progresivamente desde `legacy-app.js` estos módulos:

1. `services/auth.service.js`
2. `services/stable.service.js`
3. `features/horses/`
4. `features/trainings/`
5. `features/health/`
6. `features/expenses/`
7. `features/team/`
8. `features/stats/`
9. `utils/` y `state.js`

No conviene dividir todo de golpe. Cada módulo debe extraerse y probarse antes de continuar con el siguiente.

## Firebase

Esta primera versión conserva la estructura de datos actual (`stables/{stableId}/data/main`) para evitar pérdida de datos. La migración a subcolecciones debe hacerse después de estabilizar los módulos del código.
