import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { boardActivity, boardPlanActs, boardStartOfWeek, boardToneClass, boardDateLabel } from "../boardHelpers.js";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Ports rBoardCell/boardAddActivity/boardMoveActivity/saveBoardCell
// (public/legacy-app.js:1323-1346). Fix: the activity order is real array state with
// up/down reorder controls, not (as legacy does) DOM node order read via
// querySelectorAll at save time — there's no React-idiomatic equivalent of reading final
// order from the DOM, so this is a mechanical adaptation forced by the framework, not a
// behavior change.
export function BoardCellPage() {
  const { hid, date } = useParams();
  const [searchParams] = useSearchParams();
  const week = searchParams.get("week") || boardStartOfWeek(date);
  const navigate = useNavigate();
  const { horses, weeklyPlans, boardConfig, setWeeklyPlanActivities } = useStableData();
  const { showToast } = useToast();
  const [order, setOrder] = useState(() => boardPlanActs(weeklyPlans, hid, date));

  const horse = horses.find((h) => h.id === hid);

  function backToWeekly() {
    navigate(`/boards?tab=weekly&week=${week}`);
  }

  if (!horse) {
    return (
      <div className="view">
        <p>Caballo no encontrado.</p>
      </div>
    );
  }

  function addActivity(id) {
    if (order.includes(id)) {
      showToast("La actividad ya está añadida");
      return;
    }
    setOrder((o) => [...o, id]);
  }
  function moveActivity(i, dir) {
    setOrder((o) => {
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = o.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeActivity(i) {
    setOrder((o) => o.filter((_, idx) => idx !== i));
  }
  function save() {
    setWeeklyPlanActivities(hid, date, order);
    showToast("Pizarra actualizada");
    backToWeekly();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={backToWeekly}>
          ←
        </button>
        <div>
          <span className="ey">Pizarra semanal</span>
          <h1>
            {horse.name} · {capitalize(boardDateLabel(date))}
          </h1>
        </div>
      </div>
      <div className="board-help info">
        <b>Orden cronológico</b>
        <span>Coloca las actividades en el mismo orden en que debe realizarlas el caballo.</span>
      </div>
      <div className="card">
        <label>Plan del día</label>
        <div className="board-order-list">
          {order.length ? (
            order.map((id, i) => {
              const a = boardActivity(boardConfig.activities, id);
              return (
                <div key={id} className={"board-act-order " + boardToneClass(a.tone)}>
                  <span className="board-code">{a.code}</span>
                  <b>{a.label}</b>
                  <span className="board-order-actions">
                    <button onClick={() => moveActivity(i, -1)}>↑</button>
                    <button onClick={() => moveActivity(i, 1)}>↓</button>
                    <button className="danger" onClick={() => removeActivity(i)}>
                      ×
                    </button>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="empty-soft board-empty">
              <span>＋</span>
              <div>
                <b>Sin actividades</b>
                <p>Añade las actividades previstas para este día.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <label>Añadir actividad</label>
        <div className="board-activity-picker">
          {boardConfig.activities.map((a) => (
            <button key={a.id} className={"board-pick " + boardToneClass(a.tone)} onClick={() => addActivity(a.id)}>
              <span>{a.code}</span>
              <small>{a.label}</small>
            </button>
          ))}
        </div>
      </div>
      <button className="btn bts btbl" onClick={save}>
        Guardar planificación
      </button>
    </div>
  );
}
