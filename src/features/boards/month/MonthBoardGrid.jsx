import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useTaskOccurrences } from "../../../hooks/useTaskOccurrences.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { td, addMonth, monthLabel } from "../../../lib/date.js";
import { getMonthGrid, MONTH_GRID_WEEKDAY_LABELS as WEEKDAY_LABELS } from "../../../lib/monthGrid.js";
import { boardPlan, boardActivity, boardToneClass, boardStartOfWeek } from "../boardHelpers.js";
import { sortHorsesByOrder } from "../../horses/horseOrder.js";
import { visibleTasksForUser } from "../../tasks/taskHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { MonthDayTasksSheet } from "./MonthDayTasksSheet.jsx";

// Month-at-a-glance view of the weekly board — not part of the reference app this feature
// was reworked from (it only has a weekly view). Mirrors the existing month-grid pattern
// from the team absence calendar (features/team/TeamCalendarPage.jsx) instead: same
// all-horses/one-horse toggle, same weekday grid with leading blank cells for days before
// the 1st, same "pick a mode, then read/tap day cells" shape — reusing an already-
// established pattern rather than inventing a new one.
export function MonthBoardGrid() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stableId, horses, tasks, weeklyPlans, boardConfig } = useStableData();
  const { isAdmin, myTeamMember, can } = usePermissions();
  const [openDate, setOpenDate] = useState(null);

  const m = searchParams.get("month") || td().slice(0, 7);
  const mode = searchParams.get("mode") || "all";
  const sortedHorses = sortHorsesByOrder(horses);
  const hid = searchParams.get("horse") || (sortedHorses[0] ? sortedHorses[0].id : "");
  const selected = sortedHorses.find((h) => h.id === hid);
  const myMid = myTeamMember ? myTeamMember.id : null;

  const { firstDow, daysInMonth, rangeStart, rangeEnd } = getMonthGrid(m);
  // useTaskOccurrences/getMonthGrid are called unconditionally, before the "no horses yet"
  // early return below, so hook call order stays stable across renders either way.
  const monthOccurrences = useTaskOccurrences(stableId, tasks, rangeStart, rangeEnd);
  const visibleOccurrences = visibleTasksForUser(monthOccurrences, isAdmin, myMid);
  const tasksByDate = {};
  visibleOccurrences.forEach((t) => {
    const d = t.occurrenceDate || t.startDate;
    (tasksByDate[d] ||= []).push(t);
  });

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params, { replace: true });
  }

  function handleCreateTask() {
    const back = `/boards?tab=month&month=${m}&mode=${mode}${mode === "one" ? `&horse=${hid}` : ""}`;
    navigate(`/tasks/new?d=${openDate}&return=${encodeURIComponent(back)}`);
  }

  if (!horses.length) {
    return <EmptyState icon="🐴">Añade caballos para ver el mes.</EmptyState>;
  }

  // In "one horse" mode a day drills into that cell's full editor (same destination the
  // weekly grid uses when no tool is armed); in "all horses" mode there's no single cell to
  // jump to, so it drills into the weekly tab for that day's week instead.
  function goToDay(ds) {
    if (mode === "one" && hid) {
      navigate(`/boards/cell/${hid}/${ds}?week=${boardStartOfWeek(ds)}`);
    } else {
      navigate(`/boards?tab=weekly&week=${boardStartOfWeek(ds)}`);
    }
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={"pad" + i} style={{ minHeight: "72px", border: "1px solid transparent" }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${m}-${String(d).padStart(2, "0")}`;
    const isToday = ds === td();
    const horsesWithContent =
      mode === "all"
        ? sortedHorses.filter((h) => {
            const plan = boardPlan(weeklyPlans, h.id, ds);
            return plan && ((plan.activities || []).length || plan.note);
          })
        : [];
    const onePlan = mode === "one" && hid ? boardPlan(weeklyPlans, hid, ds) : null;
    const oneActivities = onePlan ? onePlan.activities || [] : [];
    const dayTasks = tasksByDate[ds] || [];

    cells.push(
      <div
        key={ds}
        onClick={() => goToDay(ds)}
        style={{
          minHeight: "78px",
          border: `1px solid ${isToday ? "var(--v)" : "var(--li)"}`,
          borderRadius: "10px",
          background: "#fff",
          padding: ".36rem",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          gap: ".16rem",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: ".8rem", color: "var(--ti)" }}>
          {d}
          {isToday ? " · hoy" : ""}
        </span>
        {mode === "all"
          ? horsesWithContent.length > 0 && (
              <span style={{ fontSize: ".6rem", color: "var(--gr)" }}>
                {horsesWithContent.length} caballo{horsesWithContent.length !== 1 ? "s" : ""}
              </span>
            )
          : oneActivities.length > 0 && (
              <span style={{ display: "flex", flexWrap: "wrap", gap: ".1rem" }}>
                {oneActivities.map((id) => {
                  const a = boardActivity(boardConfig.activities, id);
                  return (
                    <span
                      key={id}
                      className={"plan-code " + boardToneClass(a.tone)}
                      style={{ minWidth: "18px", height: "18px", fontSize: ".55rem" }}
                    >
                      {a.code}
                    </span>
                  );
                })}
              </span>
            )}
        {(dayTasks.length > 0 || can("tasks")) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDate(ds);
            }}
            style={{
              marginTop: "auto",
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: ".15rem",
              fontSize: ".58rem",
              fontWeight: 800,
              color: "var(--az)",
              background: "var(--al)",
              border: "1px solid var(--az)",
              borderRadius: "999px",
              padding: ".08rem .4rem",
            }}
          >
            {dayTasks.length > 0 ? `📋 ${dayTasks.length}` : "📋 +"}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem" }}>
        <div className="r2">
          <div className="f">
            <label>Vista</label>
            <select value={mode} onChange={(e) => setParam("mode", e.target.value)}>
              <option value="all">Todos los caballos</option>
              <option value="one">Un caballo</option>
            </select>
          </div>
          <div className="f">
            <label>Mes</label>
            <input type="month" value={m} onChange={(e) => setParam("month", e.target.value)} />
          </div>
        </div>
        {mode === "one" && (
          <div className="f">
            <label>Caballo</label>
            <select value={hid} onChange={(e) => setParam("horse", e.target.value)}>
              {sortedHorses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem" }}>
          <button className="btn btsm btg" onClick={() => setParam("month", addMonth(m, -1))}>
            ‹ Mes anterior
          </button>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              textTransform: "capitalize",
              color: "var(--ti)",
            }}
          >
            {monthLabel(m)}
          </div>
          <button className="btn btsm btg" onClick={() => setParam("month", addMonth(m, 1))}>
            Mes siguiente ›
          </button>
        </div>
      </div>
      <div style={{ fontSize: ".78rem", color: "var(--gr)", marginBottom: ".55rem" }}>
        {mode === "all" ? (
          "Vista conjunta. Toca un día para ir a esa semana."
        ) : (
          <>
            Toca un día para editar el plan de <b>{selected ? selected.name : "este caballo"}</b>.
          </>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: ".28rem",
          marginBottom: ".4rem",
          fontSize: ".62rem",
          fontWeight: 800,
          color: "var(--gr)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: ".28rem", marginBottom: "1rem" }}>{cells}</div>
      {openDate && (
        <MonthDayTasksSheet
          date={openDate}
          tasks={tasksByDate[openDate] || []}
          onClose={() => setOpenDate(null)}
          onCreateTask={handleCreateTask}
          canCreate={can("tasks")}
        />
      )}
    </>
  );
}
