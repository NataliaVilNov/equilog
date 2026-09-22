import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { td, addD, fD } from "../../../lib/date.js";
import { uid } from "../../../lib/id.js";
import { boardWeekDates, boardPlan, boardActivity, boardDateLabel } from "../boardHelpers.js";
import { sortHorsesByOrder } from "../../horses/horseOrder.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { BoardToolbar } from "./BoardToolbar.jsx";
import { PeriodicColumnCell } from "./PeriodicColumnCell.jsx";
import { BoardCell } from "./BoardCell.jsx";
import { NoteSheet } from "./NoteSheet.jsx";
import { DoneChecklistSheet } from "./DoneChecklistSheet.jsx";
import { VetDetailSheet } from "./VetDetailSheet.jsx";

// The VET activity's id is a hardcoded literal, not a generic flag — matches the reference
// app's own VET-second-tap behavior, which is tied to a literal code string too (see
// docs/components/boards.md). Renaming/removing the "vet" board activity breaks the badge
// rendering and second-tap detail flow below, same known limitation as the reference
// implementation.
const VET_ACTIVITY_ID = "vet";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function DateHeaderLabel({ date }) {
  const label = capitalize(boardDateLabel(date));
  const i = label.indexOf(" ");
  if (i === -1) return <span>{label}</span>;
  return (
    <span>
      {label.slice(0, i)}
      <br />
      {label.slice(i + 1)}
    </span>
  );
}

// Ports rWeeklyBoard (public/legacy-app.js:1358-1372) plus a multi-tool toolbar/cell-action
// model added afterward (not a legacy port — see docs/components/boards.md): a single armed
// tool (an activity, or Nota/Hecho/Copiar/Borrar) governs what tapping a cell does, matching
// the reference "pizarra semanal" app's interaction model. The armed tool is ordinary
// component state, same as the single-activity quick-assign mode it replaces.
export function WeeklyBoardGrid({ week }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    horses,
    weeklyPlans,
    health,
    boardConfig,
    toggleWeeklyPlanActivity,
    setWeeklyPlanNote,
    toggleWeeklyPlanCompleted,
    pasteWeeklyPlanContent,
    repeatPreviousWeek,
    eraseWeeklyPlanCell,
    setWeeklyPlanVetLink,
    addHealthRecord,
    updateHealthRecord,
  } = useStableData();
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null); // {hid, date} | null
  const [doneTarget, setDoneTarget] = useState(null); // {hid, date} | null
  const [vetTarget, setVetTarget] = useState(null); // {hid, date} | null
  const [copySource, setCopySource] = useState(null); // {hid, date} | null

  const sortedHorses = sortHorsesByOrder(horses);
  const dates = boardWeekDates(week);
  const end = dates[6];
  const today = td();
  const copyMode = activeTool === "copy";

  function shiftWeek(n) {
    const params = new URLSearchParams(searchParams);
    params.set("week", addD(week, n * 7));
    navigate(`/boards?${params.toString()}`);
  }

  function toggleTool(id) {
    const next = activeTool === id ? null : id;
    setActiveTool(next);
    setCopySource(null);
    if (!next) {
      showToast("Herramienta desactivada");
      return;
    }
    if (["note", "done", "copy", "erase"].includes(next)) {
      showToast("Toca una casilla para " + { note: "añadir una nota", done: "marcar hecho", copy: "copiar", erase: "borrar" }[next]);
      return;
    }
    const a = boardActivity(boardConfig.activities, next);
    showToast("Herramienta " + a.code + ": toca las casillas que quieras");
  }

  function handleRepeatPreviousWeek() {
    if (!window.confirm("¿Copiar el contenido de la semana anterior a esta semana? No se borrará lo que ya tengas distinto.")) {
      return;
    }
    repeatPreviousWeek(week);
    showToast("Semana anterior repetida");
  }

  function handleCopyClick(hid, date) {
    const plan = boardPlan(weeklyPlans, hid, date);
    const hasContent = !!(plan && ((plan.activities || []).length || plan.note));
    if (!copySource) {
      if (!hasContent) {
        showToast("Esa casilla está vacía. Elige una con contenido como origen.");
        return;
      }
      setCopySource({ hid, date });
      showToast("Origen elegido. Ahora toca todas las casillas donde quieras copiarlo.");
      return;
    }
    if (copySource.hid === hid && copySource.date === date) {
      setCopySource(null);
      showToast("Origen desmarcado.");
      return;
    }
    pasteWeeklyPlanContent(copySource.hid, copySource.date, [{ hid, date }]);
    showToast("1 casilla copiada · las tareas quedan pendientes");
  }

  function pasteToDay(date) {
    if (!copySource) return;
    const targets = sortedHorses
      .filter((h) => !(h.id === copySource.hid && date === copySource.date))
      .map((h) => ({ hid: h.id, date }));
    if (!targets.length) return;
    pasteWeeklyPlanContent(copySource.hid, copySource.date, targets);
    showToast(`${targets.length} casillas copiadas · las tareas quedan pendientes`);
  }

  function pasteToHorseRow(hid) {
    if (!copySource) return;
    const targets = dates.filter((d) => !(hid === copySource.hid && d === copySource.date)).map((d) => ({ hid, date: d }));
    if (!targets.length) return;
    pasteWeeklyPlanContent(copySource.hid, copySource.date, targets);
    showToast(`${targets.length} casillas copiadas · las tareas quedan pendientes`);
  }

  function clickCell(hid, date) {
    if (!activeTool) {
      navigate(`/boards/cell/${hid}/${date}?week=${week}`);
      return;
    }
    if (activeTool === "copy") {
      handleCopyClick(hid, date);
      return;
    }
    if (activeTool === "note") {
      setNoteTarget({ hid, date });
      return;
    }
    if (activeTool === "done") {
      const plan = boardPlan(weeklyPlans, hid, date);
      if (!plan || !(plan.activities || []).length) return;
      setDoneTarget({ hid, date });
      return;
    }
    if (activeTool === "erase") {
      const plan = boardPlan(weeklyPlans, hid, date);
      const hasContent = !!(plan && ((plan.activities || []).length || plan.note));
      if (hasContent && !window.confirm("¿Borrar todo el contenido de esta casilla?")) return;
      eraseWeeklyPlanCell(hid, date);
      return;
    }
    // Activity tool — the VET second tap opens the detail sheet instead of toggling it off.
    if (activeTool === VET_ACTIVITY_ID) {
      const plan = boardPlan(weeklyPlans, hid, date);
      if (plan && (plan.activities || []).includes(VET_ACTIVITY_ID)) {
        setVetTarget({ hid, date });
        return;
      }
    }
    toggleWeeklyPlanActivity(hid, date, activeTool);
  }

  function handleSaveNote(text) {
    const { hid, date } = noteTarget;
    setWeeklyPlanNote(hid, date, text);
    setNoteTarget(null);
  }

  function handleToggleDone(activityId) {
    const { hid, date } = doneTarget;
    toggleWeeklyPlanCompleted(hid, date, activityId);
  }

  function handleSaveVetDetail(detailText) {
    const { hid, date } = vetTarget;
    const plan = boardPlan(weeklyPlans, hid, date);
    if (plan && plan.vetHealthId) {
      updateHealthRecord(plan.vetHealthId, { notes: detailText });
    } else {
      const id = uid();
      addHealthRecord({
        id,
        hid,
        type: "otro",
        label: "Revisión veterinaria",
        date,
        nxt: null,
        notes: detailText,
        amount: 0,
        payStatus: "pendiente",
        payee: "",
      });
      setWeeklyPlanVetLink(hid, date, id);
    }
    setVetTarget(null);
    showToast("Registro de salud guardado");
  }

  const noteTargetPlan = noteTarget ? boardPlan(weeklyPlans, noteTarget.hid, noteTarget.date) : null;
  const doneTargetPlan = doneTarget ? boardPlan(weeklyPlans, doneTarget.hid, doneTarget.date) : null;
  const vetTargetPlan = vetTarget ? boardPlan(weeklyPlans, vetTarget.hid, vetTarget.date) : null;
  const vetTargetRecord = vetTargetPlan && vetTargetPlan.vetHealthId ? health.find((r) => r.id === vetTargetPlan.vetHealthId) : null;

  return (
    <>
      <div className="board-toolbar">
        <button className="ib" onClick={() => shiftWeek(-1)}>
          ←
        </button>
        <div>
          <b>
            {fD(week)} — {fD(end)}
          </b>
          <small>
            {activeTool ? "Herramienta activa: toca las casillas que quieras." : "Elige una herramienta o pulsa una casilla para ordenar."}
          </small>
        </div>
        <button className="ib" onClick={() => shiftWeek(1)}>
          →
        </button>
      </div>
      <button
        className="btn btg btsm"
        style={{ borderStyle: "dashed", marginBottom: ".7rem" }}
        onClick={handleRepeatPreviousWeek}
      >
        ↻ Repetir anterior
      </button>

      {!sortedHorses.length ? (
        <EmptyState icon="🐴">Añade caballos para utilizar la pizarra.</EmptyState>
      ) : (
        <>
          <BoardToolbar activities={boardConfig.activities} active={activeTool} onToggle={toggleTool} />
          <div className="board-fit">
            <table className="weekly-board compact-board">
              <colgroup>
                <col className="col-horse" />
                {dates.map((d) => (
                  <col key={d} className="col-day" />
                ))}
                {boardConfig.periodicColumns.map((c) => (
                  <col key={c.id} className="col-periodic" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="horse-col">Caballo</th>
                  {dates.map((d) => (
                    <th key={d} className={d === today ? "is-today" : ""}>
                      {copyMode && copySource ? (
                        <button
                          type="button"
                          className="copy-target"
                          onClick={() => pasteToDay(d)}
                          style={{ background: "none", border: "none", width: "100%", cursor: "copy" }}
                        >
                          <DateHeaderLabel date={d} />
                        </button>
                      ) : (
                        <DateHeaderLabel date={d} />
                      )}
                    </th>
                  ))}
                  {boardConfig.periodicColumns.map((c) => (
                    <th key={c.id} className="periodic-head" title={c.label}>
                      <span>{c.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedHorses.map((h) => (
                  <tr key={h.id}>
                    <th className="horse-col">
                      {copyMode && copySource ? (
                        <button
                          type="button"
                          className="board-horse-name copy-target"
                          onClick={() => pasteToHorseRow(h.id)}
                          style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "copy" }}
                        >
                          {h.photo ? <img src={h.photo} alt="" /> : <span>🐴</span>}
                          <b>{h.name}</b>
                        </button>
                      ) : (
                        <div className="board-horse-name">
                          {h.photo ? <img src={h.photo} alt="" /> : <span>🐴</span>}
                          <b>{h.name}</b>
                        </div>
                      )}
                    </th>
                    {dates.map((d) => (
                      <BoardCell
                        key={d}
                        date={d}
                        isToday={d === today}
                        activeTool={activeTool}
                        plan={boardPlan(weeklyPlans, h.id, d)}
                        boardActivities={boardConfig.activities}
                        vetActivityId={VET_ACTIVITY_ID}
                        isCopySource={!!(copySource && copySource.hid === h.id && copySource.date === d)}
                        isCopyTarget={copyMode && !!copySource && !(copySource.hid === h.id && copySource.date === d)}
                        onClick={() => clickCell(h.id, d)}
                      />
                    ))}
                    {boardConfig.periodicColumns.map((c) => (
                      <PeriodicColumnCell key={c.id} hid={h.id} column={c} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="board-legend">
        <span className="ok">Verde: al día</span>
        <span className="warn">Amarillo: próximo o pendiente</span>
        <span className="bad">Rojo: vencido o conflicto</span>
        <span className="info">Azul: información</span>
      </div>

      {noteTarget && (
        <NoteSheet note={noteTargetPlan ? noteTargetPlan.note : ""} onSave={handleSaveNote} onClose={() => setNoteTarget(null)} />
      )}
      {doneTarget && doneTargetPlan && (
        <DoneChecklistSheet
          activityIds={doneTargetPlan.activities || []}
          completed={doneTargetPlan.completed || []}
          allActivities={boardConfig.activities}
          onToggle={handleToggleDone}
          onClose={() => setDoneTarget(null)}
          onEditOrder={() => navigate(`/boards/cell/${doneTarget.hid}/${doneTarget.date}?week=${week}`)}
        />
      )}
      {vetTarget && (
        <VetDetailSheet
          initialDetail={vetTargetRecord ? vetTargetRecord.notes : ""}
          onSave={handleSaveVetDetail}
          onClose={() => setVetTarget(null)}
        />
      )}
    </>
  );
}
