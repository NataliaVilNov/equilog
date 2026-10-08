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
import { NotionSyncButton } from "../../notion/NotionSyncButton.jsx";

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
// tool (an activity, or Nota/Hecho/Borrar) governs what tapping a cell does, matching
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

  const sortedHorses = sortHorsesByOrder(horses);
  const dates = boardWeekDates(week);
  const end = dates[6];
  const today = td();

  function shiftWeek(n) {
    const params = new URLSearchParams(searchParams);
    params.set("week", addD(week, n * 7));
    navigate(`/boards?${params.toString()}`);
  }

  function toggleTool(id) {
    const next = activeTool === id ? null : id;
    setActiveTool(next);
    if (!next) {
      showToast("Herramienta desactivada");
      return;
    }
    if (["note", "done", "erase"].includes(next)) {
      showToast("Toca una casilla para " + { note: "añadir una nota", done: "marcar hecho", erase: "borrar" }[next]);
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

  function clickCell(hid, date) {
    if (!activeTool) {
      navigate(`/boards/cell/${hid}/${date}?week=${week}`);
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
    // updateHealthRecord takes the whole record (it rewrites the doc and its linked expense), so
    // merge the new notes into the existing one. A dangling link (record deleted from Salud)
    // falls through to creating a fresh record, which also re-links the cell.
    const linked = plan && plan.vetHealthId ? health.find((r) => r.id === plan.vetHealthId) : null;
    if (linked) {
      updateHealthRecord({ ...linked, notes: detailText });
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
      <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginBottom: ".7rem" }}>
        <button className="btn btg btsm" style={{ borderStyle: "dashed" }} onClick={handleRepeatPreviousWeek}>
          ↻ Repetir anterior
        </button>
        <NotionSyncButton scope={{ from: week, to: end, plans: true }} label="Enviar semana a Notion" />
      </div>

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
                      <DateHeaderLabel date={d} />
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
                      <div
                        className="board-horse-name"
                        role="link"
                        tabIndex={0}
                        title={`Ver la ficha de ${h.name}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/horses/${h.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/horses/${h.id}`);
                          }
                        }}
                      >
                        {h.photo ? <img src={h.photo.url} alt="" /> : <span>🐴</span>}
                        <b>{h.name}</b>
                      </div>
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
