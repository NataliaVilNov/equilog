import { useEffect, useMemo, useRef, useState } from "react";
import { SlideUpSheet } from "../../components/SlideUpSheet.jsx";
import { useToast } from "../../hooks/useToast.js";
import { parseHorsetelexSource, buildHorsetelexUpdates } from "./horsetelexParser.js";
import { HORSETELEX_BOOKMARKLET } from "./horsetelexBookmarklet.js";

// What the sheet previews, in display order: [parsed key, form key (for "ya tienes"), label].
const PREVIEW_ROWS = [
  ["horseName", "name", "Nombre"],
  ["breed", "breed", "Raza / studbook"],
  ["origin", "origin", "Criador"],
  ["sire", "sire", "Padre"],
  ["dam", "dam", "Madre"],
  ["gsire", "gsire", "Abuelo paterno"],
  ["gdam", "gdam", "Abuela paterna"],
  ["mgsire", "mgsire", "Abuelo materno"],
  ["mgdam", "mgdam", "Abuela materna"],
  ["horsetelexUrl", "horsetelex", "Enlace Horsetelex"],
];

function problemFor(raw) {
  if (!raw) return null;
  if (/just a moment|cf-chl|challenge-platform/i.test(raw) && !/serverApp-state/.test(raw)) {
    return "Has copiado la página de verificación de Cloudflare, no la ficha. Espera a que cargue el caballo y vuelve a copiar.";
  }
  return "No encuentro los datos del caballo. Abre la ficha del caballo en Horsetelex (con el pedigree a la vista) y copia todo: en el ordenador el código fuente (Ctrl+U, Ctrl+A, Ctrl+C), en el móvil el texto de la página (mantén pulsado, Seleccionar todo, Copiar).";
}

// Phones have no Ctrl+U and can't drag a bookmarklet, so they get the copy-the-visible-text
// route first; the source route stays one tap away.
const isTouchDevice = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

// The bookmarklet's href is a javascript: URL, which React refuses to render as a prop.
function BookmarkletLink() {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.setAttribute("href", HORSETELEX_BOOKMARKLET);
  }, []);
  return (
    <a ref={ref} className="btn btg btsm" draggable onClick={(e) => e.preventDefault()}>
      🔖 Copiar de Horsetelex
    </a>
  );
}

// EquiLog can't fetch Horsetelex (Cloudflare bot challenge, no CORS), so the user hands over
// the page they already have open: this sheet takes its source code pasted in, reads the
// horse's pedigree out of it (horsetelexParser.js), shows what it found, and only on "Aplicar"
// merges it into the horse form — nothing is saved until "Guardar caballo".
// `current` is the in-progress form state, so already-filled fields can be left alone.
export function HorsetelexImportButton({ current, onImport }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const textareaRef = useRef(null);
  const touch = useMemo(isTouchDevice, []);

  const parsed = useMemo(() => parseHorsetelexSource(raw), [raw]);

  function close() {
    setOpen(false);
    setRaw("");
    setOverwrite(false);
  }

  async function pasteFromClipboard() {
    try {
      setRaw(await navigator.clipboard.readText());
    } catch (_err) {
      showToast("No puedo leer el portapapeles: pega en el cuadro con Ctrl+V");
      if (textareaRef.current) textareaRef.current.focus();
    }
  }

  function apply() {
    onImport(buildHorsetelexUpdates(parsed, current, { overwrite }));
    showToast("Datos de Horsetelex aplicados · revisa y pulsa Guardar caballo");
    close();
  }

  const updates = parsed ? buildHorsetelexUpdates(parsed, current, { overwrite }) : {};

  return (
    <div>
      <div style={{ marginTop: ".5rem" }}>
        <button type="button" className="btn btsm" onClick={() => setOpen(true)}>
          🧬 Importar de Horsetelex
        </button>
      </div>
      {open && (
        <SlideUpSheet title="Importar de Horsetelex" onClose={close}>
          <div style={{ fontSize: ".78rem", color: "var(--gr)", margin: "0 0 .7rem", lineHeight: 1.5 }}>
            <details open={touch}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>📱 En el móvil</summary>
              <ol style={{ paddingLeft: "1.1rem", margin: ".3rem 0" }}>
                <li>Abre la ficha del caballo en Horsetelex con el navegador del móvil y espera a que se vea el pedigree.</li>
                <li>
                  Mantén pulsado un texto, elige <b>Seleccionar todo</b> y luego <b>Copiar</b>.
                </li>
                <li>Vuelve aquí y pulsa «Pegar del portapapeles».</li>
              </ol>
              <div style={{ fontSize: ".7rem" }}>
                Se lee el texto visible, así que el pedigree tiene que verse completo (4 generaciones). En Android también vale{" "}
                <code>view-source:</code> delante de la dirección y copiar todo.
              </div>
            </details>
            <details open={!touch} style={{ marginTop: ".4rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>💻 En el ordenador</summary>
              <ol style={{ paddingLeft: "1.1rem", margin: ".3rem 0" }}>
                <li>Abre la ficha del caballo en Horsetelex.</li>
                <li>
                  Pulsa <b>Ctrl+U</b> (código fuente), <b>Ctrl+A</b> y <b>Ctrl+C</b>.
                </li>
                <li>Pega aquí y revisa lo que se ha leído.</li>
              </ol>
            </details>
          </div>
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="Pega aquí lo que has copiado de la ficha…"
            onChange={(e) => setRaw(e.target.value)}
            style={{ width: "100%", fontSize: ".75rem", marginBottom: ".5rem" }}
          />
          <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginBottom: ".4rem" }}>
            <button type="button" className="btn btg btsm" onClick={pasteFromClipboard}>
              📋 Pegar del portapapeles
            </button>
            {!touch && <BookmarkletLink />}
          </div>
          <div style={{ fontSize: ".68rem", color: "var(--gr)", marginBottom: ".8rem" }}>
            {!touch && "Atajo: arrastra «Copiar de Horsetelex» a tu barra de marcadores y púlsalo estando en la ficha; luego pulsa «Pegar del portapapeles». "}
            Los datos se leen solo en tu navegador; EquiLog no se conecta a Horsetelex.
          </div>

          {raw && !parsed && (
            <div style={{ fontSize: ".78rem", color: "var(--am)", marginBottom: ".6rem" }}>⚠️ {problemFor(raw)}</div>
          )}

          {parsed && (
            <>
              <div style={{ border: "1px solid var(--li)", borderRadius: "11px", padding: ".6rem .75rem", marginBottom: ".6rem" }}>
                {PREVIEW_ROWS.map(([key, formKey, label]) => {
                  if (!parsed[key]) return null;
                  const kept = !(formKey in updates) && current && current[formKey];
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", fontSize: ".78rem", padding: ".18rem 0" }}>
                      <span style={{ color: "var(--gr)" }}>{label}</span>
                      <span style={{ textAlign: "right", wordBreak: "break-word" }}>
                        <b>{parsed[key]}</b>
                        {kept ? <small style={{ color: "var(--gr)" }}> · se mantiene «{current[formKey]}»</small> : null}
                      </span>
                    </div>
                  );
                })}
                {parsed.birthYear && !parsed.dob && (
                  <div style={{ fontSize: ".7rem", color: "var(--gr)", paddingTop: ".3rem" }}>
                    Nacido en {parsed.birthYear}. Horsetelex no da la fecha completa, así que «Nacimiento» no se toca.
                  </div>
                )}
              </div>
              {parsed.via === "text" && !parsed.pedigreeComplete && (
                <div style={{ fontSize: ".75rem", color: "var(--am)", marginBottom: ".6rem" }}>
                  ⚠️ En el texto copiado faltan antepasados, así que no puedo colocar el pedigree con seguridad. Solo se aplicarán
                  nombre y raza; rellena el pedigree a mano o usa el código fuente (Ctrl+U) desde un ordenador.
                </div>
              )}
              {parsed.via === "text" && parsed.pedigreeComplete && (
                <div style={{ fontSize: ".7rem", color: "var(--gr)", marginBottom: ".6rem" }}>
                  Leído del texto visible: comprueba que padres y abuelos están en su sitio.
                </div>
              )}
              <label
                style={{ display: "flex", gap: ".5rem", alignItems: "center", fontSize: ".75rem", color: "var(--gr)", marginBottom: ".7rem", textTransform: "none", letterSpacing: 0 }}
              >
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  style={{ width: "auto", minHeight: 0, padding: 0, flexShrink: 0 }}
                />
                Sobrescribir también nombre, raza, criador y enlace si ya los tengo rellenos
              </label>
              <button type="button" className="btn bts btbl" onClick={apply}>
                Aplicar al formulario
              </button>
            </>
          )}
        </SlideUpSheet>
      )}
    </div>
  );
}
