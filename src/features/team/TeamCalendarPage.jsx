import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { td, fD } from "../../lib/date.js";
import { EmptyState } from "../../components/EmptyState.jsx";
import { monthStartStr, addMonth, monthLabel, memberColor, memberColorSoft } from "./teamCalendarHelpers.js";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Ports rTeamCalendar (public/legacy-app.js:3322-3377).
export function TeamCalendarPage() {
  const { team, absences, tasks, toggleAbsence } = useStableData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const m = searchParams.get("month") || td().slice(0, 7);
  const mode = searchParams.get("mode") || "all";
  const pid = searchParams.get("pid") || (team[0] ? team[0].id : "");
  const selected = team.find((x) => x.id === pid);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params, { replace: true });
  }

  if (!team.length) {
    return (
      <div className="view">
        <div className="vh">
          <button className="ib" onClick={() => navigate("/team")}>
            ←
          </button>
          <h1>Calendario equipo</h1>
        </div>
        <EmptyState icon="👥">Añade integrantes al equipo para marcar descansos.</EmptyState>
      </div>
    );
  }

  const first = new Date(monthStartStr(m) + "T12:00:00");
  const y = first.getFullYear();
  const mo = first.getMonth();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={"pad" + i} style={{ minHeight: "72px", border: "1px solid transparent" }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${m}-${String(d).padStart(2, "0")}`;
    const dayAbs = absences.filter((a) => a.date === ds && (mode === "all" || a.pid === pid));
    const dayTasks = tasks.filter((t) => t.date === ds && (mode === "all" || t.pid === pid));
    const isToday = ds === td();
    const border = dayAbs.length ? "#FECACA" : isToday ? "var(--v)" : "var(--li)";
    const bg = dayAbs.length ? "#FFFBFB" : "#fff";

    const perMemberTaskCounts = team
      .map((tm) => ({ tm, n: dayTasks.filter((t) => t.pid === tm.id).length }))
      .filter((x) => x.n > 0);
    const more = mode === "all" && perMemberTaskCounts.length > 3;

    cells.push(
      <button
        key={ds}
        type="button"
        onClick={() => toggleAbsence(pid, ds)}
        style={{
          minHeight: "78px",
          border: `1px solid ${border}`,
          borderRadius: "10px",
          background: bg,
          padding: ".36rem",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          gap: ".16rem",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: ".8rem", color: dayAbs.length ? "#991B1B" : "var(--ti)" }}>
          {d}
          {isToday ? " · hoy" : ""}
        </span>
        {dayAbs.length > 0 && (
          <span style={{ display: "flex", flexDirection: "column", gap: ".12rem", minWidth: 0 }}>
            {dayAbs.map((a) => {
              const tm = team.find((x) => x.id === a.pid);
              const c = memberColor(team, a.pid);
              return (
                <span
                  key={a.id}
                  title={tm ? tm.name : ""}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".18rem",
                    maxWidth: "100%",
                    padding: ".08rem .32rem",
                    borderRadius: "999px",
                    background: memberColorSoft(team, a.pid),
                    color: c,
                    border: `1px solid ${c}`,
                    fontSize: ".54rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: c,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {tm ? (tm.name || "").split(" ")[0] : "?"}
                </span>
              );
            })}
          </span>
        )}
        {mode === "all"
          ? perMemberTaskCounts.length > 0 && (
              <span style={{ display: "flex", flexDirection: "column", gap: ".05rem", marginTop: "auto" }}>
                {perMemberTaskCounts.slice(0, 3).map(({ tm, n }) => (
                  <span key={tm.id} style={{ fontSize: ".52rem", color: memberColor(team, tm.id), fontWeight: 800 }}>
                    {(tm.name || "").split(" ")[0]}: {n}
                  </span>
                ))}
                {more && <span style={{ fontSize: ".52rem", color: "var(--gr)" }}>+ más</span>}
              </span>
            )
          : dayTasks.length > 0 && (
              <span style={{ display: "flex", flexDirection: "column", gap: ".05rem", marginTop: "auto" }}>
                <span style={{ fontSize: ".6rem", color: "var(--gr)" }}>
                  {dayTasks.length} tarea{dayTasks.length !== 1 ? "s" : ""}
                </span>
              </span>
            )}
      </button>
    );
  }

  const list = absences
    .filter((a) => a.date.slice(0, 7) === m && (mode === "all" || a.pid === pid))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/team")}>
          ←
        </button>
        <h1>Calendario equipo</h1>
      </div>
      <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem" }}>
        <div className="r2">
          <div className="f">
            <label>Vista</label>
            <select value={mode} onChange={(e) => setParam("mode", e.target.value)}>
              <option value="all">Equipo completo</option>
              <option value="one">Un integrante</option>
            </select>
          </div>
          <div className="f">
            <label>Mes</label>
            <input type="month" value={m} onChange={(e) => setParam("month", e.target.value)} />
          </div>
        </div>
        <div className="f">
          <label>{mode === "all" ? "Marcar descanso de" : "Integrante"}</label>
          <select value={pid} onChange={(e) => setParam("pid", e.target.value)}>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".28rem", marginBottom: ".65rem" }}>
        {team.map((tm) => (
          <span
            key={tm.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: ".25rem",
              fontSize: ".68rem",
              fontWeight: 800,
              color: memberColor(team, tm.id),
              background: memberColorSoft(team, tm.id),
              border: `1px solid ${memberColor(team, tm.id)}`,
              borderRadius: "999px",
              padding: ".15rem .48rem",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: memberColor(team, tm.id),
                display: "inline-block",
              }}
            />
            {tm.name}
          </span>
        ))}
      </div>
      <div style={{ fontSize: ".78rem", color: "var(--gr)", marginBottom: ".55rem" }}>
        {mode === "all" ? (
          <>
            Vista conjunta del equipo. Toca un día para marcar o quitar descanso/ausencia de{" "}
            <b>{selected ? selected.name : "un integrante"}</b>.
          </>
        ) : (
          <>Toca un día para marcar o quitar descanso/ausencia de {selected ? selected.name : "este integrante"}.</>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: ".28rem",
          marginBottom: ".45rem",
          textAlign: "center",
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: ".28rem", marginBottom: "1rem" }}>
        {cells}
      </div>
      <div className="card" style={{ padding: ".85rem" }}>
        <div
          style={{
            fontSize: ".7rem",
            fontWeight: 800,
            color: "var(--gr)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: ".55rem",
          }}
        >
          Descansos del mes
        </div>
        {!list.length ? (
          <div style={{ fontSize: ".82rem", color: "var(--gr)" }}>Sin descansos marcados este mes.</div>
        ) : (
          list.map((a) => {
            const tm = team.find((x) => x.id === a.pid);
            const c = memberColor(team, a.pid);
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--li)",
                  padding: ".4rem 0",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".82rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, display: "inline-block" }} />
                  {tm ? tm.emoji || "👤" : ""} {tm ? tm.name : ""}
                </span>
                <b style={{ fontSize: ".82rem", color: "var(--ro)" }}>{fD(a.date)}</b>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
