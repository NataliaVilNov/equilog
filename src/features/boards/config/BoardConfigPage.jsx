import { useState } from "react";
import { useStableData } from "../../../hooks/useStableData.js";
import { boardToneClass } from "../boardHelpers.js";
import { WalkersConfig } from "./WalkersConfig.jsx";
import { PaddocksConfig } from "./PaddocksConfig.jsx";

// Los siete tonos que la pizarra sabe pintar (ver boardDefaults.js y las clases ba-* del CSS).
const BOARD_TONES = [
  { id: "green", label: "Verde" },
  { id: "blue", label: "Azul" },
  { id: "amber", label: "Ámbar" },
  { id: "red", label: "Rojo" },
  { id: "purple", label: "Morado" },
  { id: "teal", label: "Turquesa" },
  { id: "gray", label: "Gris" },
];

const RESOURCE_BOARDS = [
  { key: "walker", label: "Caminador" },
  { key: "paddock", label: "Paddocks" },
];

export function BoardConfigPage() {
  const {
    boardConfig,
    addBoardActivity,
    deleteBoardActivity,
    setBoardActivityTone,
    setBoardHidden,
    setSchoolMode,
    addPeriodicColumn,
    deletePeriodicColumn,
  } = useStableData();
  const [newActivityCode, setNewActivityCode] = useState("");
  const [newActivityLabel, setNewActivityLabel] = useState("");
  const [newActivityTone, setNewActivityTone] = useState("blue");
  const [newColumnLabel, setNewColumnLabel] = useState("");

  const hiddenBoards = boardConfig.hiddenBoards || [];

  function submitActivity(e) {
    e.preventDefault();
    const code = newActivityCode.trim().toUpperCase();
    const label = newActivityLabel.trim();
    if (!code || !label) return;
    addBoardActivity(code, label, newActivityTone);
    setNewActivityCode("");
    setNewActivityLabel("");
    setNewActivityTone("blue");
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
            <h2>Pizarras activas</h2>
            <p>Desmarca las que tu instalación no tenga. No se borra nada: puedes volver a activarlas cuando quieras.</p>
          </div>
        </div>
        <div className="config-list">
          {RESOURCE_BOARDS.map((b) => {
            const hidden = hiddenBoards.includes(b.key);
            return (
              <div className="config-row" key={b.key}>
                <span className="config-code">{hidden ? "✕" : "✓"}</span>
                <div>
                  <b>{b.label}</b>
                  <small>{hidden ? "Oculta" : "Visible"}</small>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", flexShrink: 0 }}>
                  <input type="checkbox" checked={!hidden} onChange={(e) => setBoardHidden(b.key, !e.target.checked)} />
                  Usar
                </label>
              </div>
            );
          })}
                    <div className="config-row">
            <span className="config-code">{boardConfig.schoolMode ? "✓" : "✕"}</span>
            <div>
              <b>Escuela</b>
              <small>{boardConfig.schoolMode ? "Alumnos y clases activados" : "Desactivado"}</small>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".4rem", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={!!boardConfig.schoolMode}
                onChange={(e) => setSchoolMode(e.target.checked)}
              />
              Usar
            </label>
          </div>
        </div>
      </section>

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
          <div className="fcol" style={{ maxWidth: "8rem" }}>
            <label>Color</label>
            <select value={newActivityTone} onChange={(e) => setNewActivityTone(e.target.value)}>
              {BOARD_TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
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
              <select
                value={a.tone || "blue"}
                onChange={(e) => setBoardActivityTone(a.id, e.target.value)}
                style={{ flexShrink: 0, maxWidth: "7rem" }}
              >
                {BOARD_TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
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

      {!hiddenBoards.includes("walker") && <WalkersConfig />}
      {!hiddenBoards.includes("paddock") && <PaddocksConfig />}
    </>
  );
}