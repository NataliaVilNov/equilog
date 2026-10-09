import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";
import { healthTypeById } from "../../lib/constants.js";
import { sortHorsesByOrder } from "./horseOrder.js";
import { EmptyState } from "../../components/EmptyState.jsx";

// Los cuidados que se repiten por ciclo, en el orden de la tabla.
const TYPES = ["herraje", "vacuna", "despar", "dientes"];

// Pantalla de puesta al día: una fila por caballo, una fecha por cuidado. Existe porque sin
// histórico los avisos de cuidados pendientes no pueden calcular nada, y meter 8 caballos × 4
// cuidados de uno en uno desde cada ficha es media hora de trabajo.
//
// Lo que se deja en blanco no se guarda: un caballo del que no se sabe cuándo se vacunó se
// queda sin aviso, que es mejor que una fecha inventada avisando en falso.
export function HealthSeedPage() {
  const navigate = useNavigate();
  const { horses, health, seedHealthHistory } = useStableData();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => sortHorsesByOrder(horses), [horses]);
  const today = td();

  if (!can("health")) {
    return <EmptyState icon="🔒">No tienes permiso para editar la salud de los caballos.</EmptyState>;
  }

  if (!sorted.length) {
    return <EmptyState icon="🐴">Añade caballos antes de rellenar su histórico.</EmptyState>;
  }

  function setDate(hid, type, value) {
    setRows((prev) => ({
      ...prev,
      [hid]: { ...prev[hid], dates: { ...(prev[hid]?.dates || {}), [type]: value } },
    }));
  }

  function setWeeks(hid, value) {
    setRows((prev) => ({ ...prev, [hid]: { ...prev[hid], weeks: value } }));
  }

  // Cuántas fechas hay escritas ahora mismo, para que el botón diga qué va a guardar.
  const filled = Object.values(rows).reduce(
    (n, r) => n + Object.values(r.dates || {}).filter(Boolean).length,
    0
  );

  function handleSave() {
    if (!filled) return;
    setSaving(true);
    const payload = Object.entries(rows).map(([hid, r]) => ({
      hid,
      dates: r.dates || {},
      shoeingDays: r.weeks,
    }));
    const written = seedHealthHistory(payload);
    showToast(`${written} registro${written !== 1 ? "s" : ""} guardado${written !== 1 ? "s" : ""}`);
    setSaving(false);
    navigate("/");
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(-1)} aria-label="Volver">
          ←
        </button>
        <h1>Poner al día la salud</h1>
      </div>

      <div className="board-help info">
        <b>Escribe la última vez que se hizo cada cosa</b>
        <span>
          Lo que no sepas, déjalo en blanco: no avisaré de ello. Las semanas de herraje son cada
          cuánto se hierra ese caballo (entre 4 y 6 normalmente).
        </span>
      </div>

      <div className="board-scroll">
        <table className="weekly-board seed-table">
          <thead>
            <tr>
              <th className="horse-col">Caballo</th>
              {TYPES.map((t) => (
                <th key={t}>
                  {healthTypeById(t).i}
                  <br />
                  {healthTypeById(t).l}
                </th>
              ))}
              <th>
                🔨
                <br />
                Semanas
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const row = rows[h.id] || {};
              const existing = (health || []).filter((r) => r.hid === h.id).length;
              return (
                <tr key={h.id}>
                  <th className="horse-col">
                    <b>{h.name}</b>
                    {existing > 0 && <small>{existing} ya guardados</small>}
                  </th>
                  {TYPES.map((t) => (
                    <td key={t}>
                      <input
                        type="date"
                        max={today}
                        className="seed-input"
                        value={row.dates?.[t] || ""}
                        onChange={(e) => setDate(h.id, t, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="number"
                      min="3"
                      max="12"
                      placeholder={h.shoeingDays ? String(Math.round(h.shoeingDays / 7)) : "5"}
                      className="seed-input"
                      value={row.weeks || ""}
                      onChange={(e) => setWeeks(h.id, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="seed-actions">
        <button className="btn bts btbl" disabled={!filled || saving} onClick={handleSave}>
          {filled ? `Guardar ${filled} fecha${filled !== 1 ? "s" : ""}` : "Escribe alguna fecha"}
        </button>
        <button className="btn btg btbl" onClick={() => navigate(-1)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}