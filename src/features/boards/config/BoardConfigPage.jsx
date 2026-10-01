import { useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";
import { boardToneClass } from "../boardHelpers.js";
import { WalkersConfig } from "./WalkersConfig.jsx";
import { PaddocksConfig } from "./PaddocksConfig.jsx";

// Ports rBoardConfig's shell, Activities and Periodic Columns sections
// (public/legacy-app.js:1448-1460), replacing legacy's prompt()-based add flow with real
// inline forms — the same real-form pattern used for every other "add X" flow in this port.
// window.confirm is kept for deletes, matching every other destructive action ported so far.
// No cascade cleanup of weeklyPlans/periodicBoardDates on delete — matches legacy's
// intentional design (see docs/components/boards.md).
export function BoardConfigPage() {
  const { boardConfig, addBoardActivity, deleteBoardActivity, addPeriodicColumn, deletePeriodicColumn } = useStableData();
  const [newActivityCode, setNewActivityCode] = useState("");
  const [newActivityLabel, setNewActivityLabel] = useState("");
  const [newColumnLabel, setNewColumnLabel] = useState("");

  function submitActivity(e) {
    e.preventDefault();
    const code = newActivityCode.trim().toUpperCase();
    const label = newActivityLabel.trim();
    if (!code || !label) return;
    addBoardActivity(code, label);
    setNewActivityCode("");
    setNewActivityLabel("");
  }
  function removeActivity(id) {
    if (!window.confirm("¿Eliminar esta actividad de la configuración?")) return;
    deleteBoardActivity(id);
  }
  function submitColumn(e) {
    e.preventDefault();
    const label = newColumnLabel.trim();
    if (!label) return;
    addPeriodicColumn(label);
    setNewColumnLabel("");
  }
  function removeColumn(id) {
    if (!window.confirm("¿Eliminar esta columna? Las fechas guardadas dejarán de mostrarse.")) return;
    deletePeriodicColumn(id);
  }

  return (
    <>
      <div className="config-intro">
        <div>
          <span className="ey">Personalización</span>
          <h2>La pizarra de tu cuadra</h2>
          <p>Configura abreviaturas, columnas periódicas, caminadores, huecos y horarios. Los cambios solo afectan a esta cuadra.</p>
        </div>
      </div>

      <section className="config-section">
        <div className="section-title">
          <div>
            <h2>Actividades</h2>
            <p>Abreviaturas que aparecen en la pizarra principal.</p>
          </div>
        </div>
        <form className="fb" onSubmit={submitActivity} style={{ marginBottom: ".75rem" }}>
          <div className="fcol" style={{ maxWidth: "6rem" }}>
            <label>Código</label>
            <input value={newActivityCode} onChange={(e) => setNewActivityCode(e.target.value)} maxLength={3} placeholder="S" />
          </div>
          <div className="fcol">
            <label>Nombre</label>
            <input value={newActivityLabel} onChange={(e) => setNewActivityLabel(e.target.value)} placeholder="Nombre de la actividad" />
          </div>
          <button className="btn btsm" type="submit">
            + Añadir
          </button>
        </form>
        <div className="config-list">
          {boardConfig.activities.map((a) => (
            <div className="config-row" key={a.id}>
              <span className={"config-code " + boardToneClass(a.tone)}>{a.code}</span>
              <div>
                <b>{a.label}</b>
                <small>{a.id}</small>
              </div>
              <button className="db" onClick={() => removeActivity(a.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="config-section">
        <div className="section-title">
          <div>
            <h2>Columnas periódicas</h2>
            <p>Herrajes, desparasitación, dientes y cualquier control propio.</p>
          </div>
        </div>
        <form className="fb" onSubmit={submitColumn} style={{ marginBottom: ".75rem" }}>
          <div className="fcol">
            <label>Nombre</label>
            <input value={newColumnLabel} onChange={(e) => setNewColumnLabel(e.target.value)} placeholder="Nombre de la columna periódica" />
          </div>
          <button className="btn btsm" type="submit">
            + Añadir
          </button>
        </form>
        <div className="config-list">
          {boardConfig.periodicColumns.map((x) => (
            <div className="config-row" key={x.id}>
              <span className={"config-code " + boardToneClass(x.tone)}>◷</span>
              <div>
                <b>{x.label}</b>
                <small>Fecha y aviso visual</small>
              </div>
              <button className="db" onClick={() => removeColumn(x.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <WalkersConfig />
      <PaddocksConfig />
    </>
  );
}
