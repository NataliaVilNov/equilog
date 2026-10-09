import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useTaskOccurrences } from "../../../hooks/useTaskOccurrences.js";
import { usePermissions } from "../../../hooks/usePermissions.js";
import { td, addMonth, monthLabel } from "../../../lib/date.js";
import { activityById, healthTypeById } from "../../../lib/constants.js";
import { getMonthGrid, MONTH_GRID_WEEKDAY_LABELS as WEEKDAY_LABELS } from "../../../lib/monthGrid.js";
import { boardPlan, boardActivity, boardToneClass } from "../boardHelpers.js";
import { sortHorsesByOrder } from "../../horses/horseOrder.js";
import { visibleTasksForUser } from "../../tasks/taskHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { MonthDayTasksSheet } from "./MonthDayTasksSheet.jsx";

// How many coloured lines a day square shows before collapsing the rest into "+N más".
const MAX_LINES = 4;

// Tono de la franja según el tipo de tarea, para que lo importante se distinga de un vistazo.
const TASK_TONES = {
  vet: "ba-red",
  herrador: "ba-amber",
  prueba: "ba-teal",
  concurso: "ba-purple",
};

// Los miembros del equipo no guardan color propio, así que el de cada profesor se deduce de su
// posición en la lista: estable mientras no se reordene el equipo y distinto para cada uno.
const TEACHER_TONES = ["ba-teal", "ba-purple", "ba-blue", "ba-amber", "ba-green", "ba-red", "ba-gray"];

// Día de la semana de una fecha "YYYY-MM-DD" en el formato de classSlots (1=lunes…7=domingo).
function weekdayOf(date) {
  const d = new Date(`${date}T12:00:00`).getDay();
  return d === 0 ? 7 : d;
}

// Month-at-a-glance view of the weekly board — not part of the reference app this feature
// was reworked from (it only has a weekly view). Laid out like a Google Calendar month: a
// left column with each row's ISO week number (tap → that week on the weekly tab), day squares
// listing the day's classes, health due dates and tasks as thin coloured lines, and a tap on a
// square opening a sheet with everything for the day (see MonthDayTasksSheet). Shares its date
// math with the team absence calendar (lib/monthGrid.js).
export function MonthBoardGrid() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stableId, horses, tasks, weeklyPlans, boardConfig, health, students, team } = useStableData();
  const { isAdmin, myTeamMember, can } = usePermissions();
  const [openDate, setOpenDate] = useState(null);

  const m = searchParams.get("month") || td().slice(0, 7);
  const mode = searchParams.get("mode") || "all";
  const sortedHorses = sortHorsesByOrder(horses);
  const hid = searchParams.get("horse") || (sortedHorses[0] ? sortedHorses[0].id : "");
  const myMid = myTeamMember ? myTeamMember.id : null;

  const { weeks, rangeStart, rangeEnd } = getMonthGrid(m);
  // useTaskOccurrences/getMonthGrid are called unconditionally, before the "no horses yet"
  // early return below, so hook call order stays stable across renders either way.
  const monthOccurrences = useTaskOccurrences(stableId, tasks, rangeStart, rangeEnd);
  const visibleOccurrences = visibleTasksForUser(monthOccurrences, isAdmin, myMid);
  const tasksByDate = {};
  visibleOccurrences.forEach((t) => {
    const d = t.occurrenceDate || t.startDate;
    (tasksByDate[d] ||= []).push(t);
  });
  // Timed tasks first (by time), untimed ones after, so the lines read like a day agenda.
  Object.values(tasksByDate).forEach((list) => list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));

  // Las clases del mes salen del horario semanal (boardConfig.classSlots), no de la colección
  // lessons: el mes solo necesita saber qué clases toca cada día, no quién monta qué poni.
  // La clave del mapa se normaliza a número por si weekday viniera guardado como texto.
  const slotsByWeekday = useMemo(() => {
    const map = {};
    const actives = (students || []).filter((s) => s.active !== false);
    const teamList = team || [];
    (boardConfig.classSlots || []).forEach((slot) => {
      const idx = teamList.findIndex((t) => t.id === slot.teacherId);
      const teacher = idx >= 0 ? teamList[idx] : null;
      const wd = Number(slot.weekday);
      map[wd] ||= [];
      map[wd].push({
        ...slot,
        teacherName: teacher ? teacher.name : "",
        toneClass: idx >= 0 ? TEACHER_TONES[idx % TEACHER_TONES.length] : "ba-gray",
        count: actives.filter((s) => (s.schedule || []).includes(slot.id)).length,
      });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.start || "").localeCompare(b.start || "")));
    return map;
  }, [boardConfig.classSlots, students, team]);

  // Las clases no son de un caballo concreto, así que solo se pintan en la vista de todos.
  const showClasses = mode === "all" && (boardConfig.classSlots || []).length > 0;

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params, { replace: true });
  }

  function backUrl() {
    return `/boards?tab=month&month=${m}&mode=${mode}${mode === "one" ? `&horse=${hid}` : ""}`;
  }

  function handleCreateTask() {
    navigate(`/tasks/new?d=${openDate}&return=${encodeURIComponent(backUrl())}`);
  }

  if (!horses.length) {
    return <EmptyState icon="🐴">Añade caballos para ver el mes.</EmptyState>;
  }

  function openWeek(monday) {
    navigate(`/boards?tab=weekly&week=${monday}`);
  }

  function classesForDay(ds) {
    if (!showClasses) return [];
    return slotsByWeekday[weekdayOf(ds)] || [];
  }

  // Todas las clases del día, para el panel de detalle (también en vista de un caballo).
  function allClassesForDay(ds) {
    return slotsByWeekday[weekdayOf(ds)] || [];
  }

  // Horses whose plan for `ds` has content, limited to the selected horse in "one" mode.
  function plansForDay(ds) {
    const scope = mode === "one" ? sortedHorses.filter((h) => h.id === hid) : sortedHorses;
    return scope
      .map((h) => ({ horse: h, plan: boardPlan(weeklyPlans, h.id, ds) }))
      .filter(({ plan }) => plan && ((plan.activities || []).length || plan.note))
      .map(({ horse, plan }) => ({
        horse,
        note: plan.note || "",
        activities: (plan.activities || []).map((id) => ({
          ...boardActivity(boardConfig.activities, id),
          done: (plan.completed || []).includes(id),
        })),
      }));
  }

  function healthDueOn(ds) {
    if (!can("health")) return [];
    return (health || [])
      .filter((r) => r.nxt === ds)
      .map((r) => {
        const horse = horses.find((h) => h.id === r.hid);
        return { ...r, horseName: horse ? horse.name : "" };
      });
  }

  // Une clases, salud y tareas en una sola lista de franjas ordenada por hora.
  function linesForDay(ds) {
    const lines = [];

    classesForDay(ds).forEach((s) => {
      const group = s.groupName || s.teacherName || "Clase";
      lines.push({
        key: "c" + s.id,
        tone: s.toneClass,
        time: s.start,
        label: group + (s.count ? ` · ${s.count}` : ""),
        title: `${s.start}–${s.end} · ${group}${s.teacherName ? " · " + s.teacherName : ""}`,
      });
    });

    healthDueOn(ds).forEach((r) => {
      const type = healthTypeById(r.type);
      lines.push({
        key: "h" + r.id,
        tone: "ba-amber",
        time: "",
        label: `${type.i} ${r.label || type.l}${r.horseName ? " · " + r.horseName : ""}`,
        title: `${r.label || type.l}${r.horseName ? " · " + r.horseName : ""}`,
      });
    });

    (tasksByDate[ds] || []).forEach((t) => {
      const horse = t.horseId ? horses.find((h) => h.id === t.horseId) : null;
      const act = activityById(t.activity);
      const label = `${act.i} ${act.l}${horse ? " · " + horse.name : ""}`;
      lines.push({
        key: "t" + t.id + (t.occurrenceDate || ""),
        tone: TASK_TONES[t.activity] || "",
        time: t.time || "",
        done: t.status === "done",
        label,
        title: (t.time ? t.time + " " : "") + label,
      });
    });

    lines.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    return lines;
  }

  function renderDay(ds) {
    const isToday = ds === td();
    const lines = linesForDay(ds);
    const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES - 1) : lines;
    const hidden = lines.length - shown.length;
    const plans = plansForDay(ds);
    const onePlan = mode === "one" ? plans[0] : null;

    return (
      <div
        key={ds}
        className={"month-day" + (isToday ? " is-today" : "")}
        role="button"
        tabIndex={0}
        onClick={() => setOpenDate(ds)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenDate(ds);
          }
        }}
      >
        <span className="month-day-num">{Number(ds.slice(8))}</span>
        <span className="month-lines">
          {shown.map((l) => (
            <span key={l.key} className={"month-line " + l.tone + (l.done ? " is-done" : "")} title={l.title}>
              {l.time && <b>{l.time}</b>}
              {l.label}
            </span>
          ))}
        </span>
        {hidden > 0 && <span className="month-more">+{hidden} más</span>}
        {onePlan ? (
          <span className="month-codes">
            {onePlan.activities.map((a) => (
              <span key={a.id} className={"plan-code " + boardToneClass(a.tone) + (a.done ? " cell-done" : "")}>
                {a.code}
              </span>
            ))}
          </span>
        ) : (
          mode === "all" &&
          plans.length > 0 && (
            <span className="month-horses">
              {plans.length} caballo{plans.length !== 1 ? "s" : ""}
            </span>
          )
        )}
      </div>
    );
  }

  return (
    <>
      <div className="board-toolbar month-toolbar">
        <button className="ib" onClick={() => setParam("month", addMonth(m, -1))} aria-label="Mes anterior">
          ←
        </button>
        <div>
          <b className="month-title">{monthLabel(m)}</b>
        </div>
        <button className="ib" onClick={() => setParam("month", addMonth(m, 1))} aria-label="Mes siguiente">
          →
        </button>
      </div>
      <div className="month-controls">
        <div className="f">
          <label>Vista</label>
          <select value={mode} onChange={(e) => setParam("mode", e.target.value)}>
            <option value="all">Todos los caballos</option>
            <option value="one">Un caballo</option>
          </select>
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
        <div className="f">
          <label>Mes</label>
          <input type="month" value={m} onChange={(e) => setParam("month", e.target.value)} />
        </div>
      </div>

      <div className="month-legend">
        {showClasses &&
          (team || []).map((t, i) => (
            <span key={t.id} className={TEACHER_TONES[i % TEACHER_TONES.length]}>
              <i />
              {t.name}
            </span>
          ))}
        <span className="ba-amber">
          <i />
          Herraje y vacunas
        </span>
        <span className="ba-red">
          <i />
          Veterinario
        </span>
        <span className="ba-purple">
          <i />
          Concurso
        </span>
      </div>

      <div className="month-board">
        <div className="month-head">
          <span className="month-wk-head">Sem</span>
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        {weeks.map((w) => (
          <div className="month-week" key={w.monday}>
            <button type="button" className="month-wk" onClick={() => openWeek(w.monday)} title="Ver esta semana">
              {w.isoWeek}
            </button>
            {w.days.map((ds, i) => (ds ? renderDay(ds) : <div key={"pad" + i} className="month-pad" />))}
          </div>
        ))}
      </div>

      {openDate && (
        <MonthDayTasksSheet
          date={openDate}
          classes={allClassesForDay(openDate)}
          tasks={tasksByDate[openDate] || []}
          plans={plansForDay(openDate)}
          healthDue={healthDueOn(openDate)}
          onClose={() => setOpenDate(null)}
          onCreateTask={handleCreateTask}
          canCreate={can("tasks")}
          onOpenWeek={() => openWeek(weeks.find((w) => w.days.includes(openDate)).monday)}
          onOpenCell={(h) =>
            navigate(`/boards/cell/${h}/${openDate}?week=${weeks.find((w) => w.days.includes(openDate)).monday}`)
          }
        />
      )}
    </>
  );
}