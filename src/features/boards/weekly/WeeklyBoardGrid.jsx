import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { td, addD, fD } from "../../../lib/date.js";
import {
  boardWeekDates,
  boardPlan,
  boardActivity,
  boardDateLabel,
} from "../boardHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { QuickAssignToolbar } from "./QuickAssignToolbar.jsx";
import { PeriodicColumnCell } from "./PeriodicColumnCell.jsx";
import { BoardCell } from "./BoardCell.jsx";

// The VET activity's id is a hardcoded literal, not a generic flag — matches the reference
// app's own VET-second-tap behavior, which is tied to a literal code string too (see
// docs/components/boards.md). Renaming/removing the "vet" board activity breaks the badge
// rendering below, same known limitation as the reference implementation.
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

// Ports rWeeklyBoard (public/legacy-app.js:1358-1372). The armed quick-assign activity is
// ordinary component state here instead of legacy's module-level _boardQuickActivity global.
export function WeeklyBoardGrid({ week }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { horses, weeklyPlans, boardConfig, toggleWeeklyPlanActivity } = useStableData();
  const { showToast } = useToast();
  const [quickActivity, setQuickActivity] = useState(null);

  const dates = boardWeekDates(week);
  const end = dates[6];
  const today = td();

  function shiftWeek(n) {
    const params = new URLSearchParams(searchParams);
    params.set("week", addD(week, n * 7));
    navigate(`/boards?${params.toString()}`);
  }

  function toggleQuick(id) {
    const next = quickActivity === id ? null : id;
    setQuickActivity(next);
    if (next) {
      const a = boardActivity(boardConfig.activities, next);
      showToast("Modo rápido " + a.code + ": toca las casillas que quieras");
    } else {
      showToast("Modo rápido desactivado");
    }
  }

  function clickCell(hid, date) {
    if (!quickActivity) {
      navigate(`/boards/cell/${hid}/${date}?week=${week}`);
      return;
    }
    toggleWeeklyPlanActivity(hid, date, quickActivity);
  }

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
            {quickActivity
              ? "Modo rápido activo: toca casillas para añadir o quitar."
              : "Selecciona una actividad rápida o pulsa una casilla para ordenar."}
          </small>
        </div>
        <button className="ib" onClick={() => shiftWeek(1)}>
          →
        </button>
      </div>

      {!horses.length ? (
        <EmptyState icon="🐴">Añade caballos para utilizar la pizarra.</EmptyState>
      ) : (
        <>
          <QuickAssignToolbar activities={boardConfig.activities} active={quickActivity} onToggle={toggleQuick} />
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
                {horses.map((h) => (
                  <tr key={h.id}>
                    <th className="horse-col">
                      <div className="board-horse-name">
                        {h.photo ? <img src={h.photo} alt="" /> : <span>🐴</span>}
                        <b>{h.name}</b>
                      </div>
                    </th>
                    {dates.map((d) => (
                      <BoardCell
                        key={d}
                        date={d}
                        isToday={d === today}
                        activeTool={quickActivity}
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

      <div className="board-legend">
        <span className="ok">Verde: al día</span>
        <span className="warn">Amarillo: próximo o pendiente</span>
        <span className="bad">Rojo: vencido o conflicto</span>
        <span className="info">Azul: información</span>
      </div>
    </>
  );
}
