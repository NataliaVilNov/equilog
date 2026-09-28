import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useTaskOccurrences } from "../../hooks/useTaskOccurrences.js";
import { td, addD, fD, dU } from "../../lib/date.js";
import { expenseCategoryById } from "../../lib/constants.js";
import { ownerListForHorse } from "../expenses/expenseSplits.js";
import { StatGrid } from "../../components/StatGrid.jsx";
import { Tabs } from "../../components/Tabs.jsx";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const TABS = [
  { key: "financiero", label: "💰 Financiero" },
  { key: "equipo", label: "👥 Equipo" },
  { key: "caballos", label: "🐴 Caballos" },
];

function FinancialTab({ totIn, totOut, cEx, pendIn, pendOut, horses, ex, navigate }) {
  const sortedEx = [...ex].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      <StatGrid
        stats={[
          { value: totIn.toFixed(0) + "€", label: "Ingresos", tone: "az" },
          { value: totOut.toFixed(0) + "€", label: "Gastos caballos", tone: "red" },
        ]}
      />
      <div className="sg sg2">
        <div className="st">
          <div className="v" style={{ color: totIn - totOut >= 0 ? "var(--v)" : "var(--ro)" }}>
            {(totIn - totOut).toFixed(0)}€
          </div>
          <div className="l">Balance</div>
        </div>
        <div className="st mo">
          <div className="v">{cEx.toFixed(0)}€</div>
          <div className="l">Gastos cuadra</div>
        </div>
      </div>
      <StatGrid
        stats={[
          { value: pendIn.toFixed(0) + "€", label: "Pendiente cobrar", tone: "az" },
          { value: pendOut.toFixed(0) + "€", label: "Pendiente pagar", tone: "red" },
        ]}
      />

      {horses.length > 1 && (
        <>
          <div className="sh">
            <h2>Por caballo</h2>
          </div>
          {horses.map((h) => {
            const hEx = ex.filter((e) => e.hid === h.id);
            if (!hEx.length) return null;
            const hOut = hEx.filter((e) => expenseCategoryById(e.cat).d === "out").reduce((s, e) => s + Number(e.amount || 0), 0);
            const hIn = hEx.filter((e) => expenseCategoryById(e.cat).d === "in").reduce((s, e) => s + Number(e.amount || 0), 0);
            return (
              <div className="xc" style={{ cursor: "pointer" }} key={h.id} onClick={() => navigate(`/horses/${h.id}?tab=gastos`)}>
                <div className="hp" style={{ width: "34px", height: "34px", fontSize: "1.1rem" }}>
                  {h.photo ? <img src={h.photo.url} alt="" /> : "🐴"}
                </div>
                <div className="xinf">
                  <div className="xl">{h.name}</div>
                  <div className="xm">{h.owner || ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--az)", fontWeight: 700 }}>+{hIn.toFixed(0)}€</div>
                  <div style={{ fontSize: ".82rem", color: "var(--ro)", fontWeight: 700 }}>-{hOut.toFixed(0)}€</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {ex.length > 0 && (
        <>
          <div className="sh">
            <h2>Detalle de movimientos</h2>
          </div>
          {sortedEx.map((e) => {
            const ec = expenseCategoryById(e.cat);
            const isIn = ec.d === "in";
            const h = horses.find((x) => x.id === e.hid);
            return (
              <div className="xc" key={e.id}>
                <div className={"xi " + (isIn ? "ingreso" : "gasto")}>{ec.i}</div>
                <div className="xinf">
                  <div className="xl">
                    {e.concept}{" "}
                    <span style={{ fontSize: ".76rem", color: "var(--gr)", fontWeight: 400 }}>— {h ? h.name : ""}</span>
                  </div>
                  <div className="xm">
                    {fD(e.date)}
                    {e.payer ? " · " + e.payer + " → " + (e.payee || "") : ""}
                  </div>
                  <span className={"sb s-" + e.status}>{capitalize(e.status)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: ".9rem", color: isIn ? "var(--az)" : "var(--ro)", flexShrink: 0 }}>
                  {isIn ? "+" : "-"}
                  {Number(e.amount).toFixed(0)}€
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// fS/fE can both be blank (no date filter set) — the occurrence hook needs concrete bounds for
// its range query, so an unset bound falls back to a generous fixed window (2 years back to
// today) scoped to just this tab; the Financial/Horses tabs keep their own literally-unbounded
// filtering untouched.
function TeamTab({ team, stableId, tasks, fS, fE }) {
  const rangeStart = fS || addD(td(), -730);
  const rangeEnd = fE || td();
  const at = useTaskOccurrences(stableId, tasks, rangeStart, rangeEnd);
  const dn = at.filter((t) => t.status === "done").length;
  const tmin = at.filter((t) => t.status === "done").reduce((s, t) => s + Number(t.dur || 0), 0);

  return (
    <>
      <StatGrid
        stats={[
          { value: at.length, label: "Tareas", tone: "az" },
          { value: dn, label: "Completadas" },
          { value: (tmin / 60).toFixed(1) + "h", label: "Horas" },
        ]}
      />
      {team.length > 0 && (
        <>
          <div className="sh">
            <h2>Por persona</h2>
          </div>
          {team.map((m) => {
            const mt = at.filter((t) => t.assignedTo === m.id);
            if (!mt.length) return null;
            const md = mt.filter((t) => t.status === "done").length;
            const mh = (mt.filter((t) => t.status === "done").reduce((s, t) => s + Number(t.dur || 0), 0) / 60).toFixed(1);
            const pct = Math.round((md / mt.length) * 100);
            return (
              <div className="mc" style={{ cursor: "default" }} key={m.id}>
                <div className="av">{m.photo ? <img src={m.photo.url} alt="" /> : m.emoji || "👤"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".93rem" }}>{m.name}</div>
                  <div style={{ marginTop: ".28rem", height: "6px", background: "var(--ar)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: "var(--az)", borderRadius: "999px" }} />
                  </div>
                  <div style={{ fontSize: ".7rem", color: "var(--gr)", marginTop: ".15rem" }}>
                    {md}/{mt.length} tareas · {mh}h
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

function HorsesTab({ horses, tr, health, navigate }) {
  const avgR = tr.length ? (tr.reduce((s, t) => s + Number(t.rating || 0), 0) / tr.length).toFixed(1) : "–";
  const totMin = tr.reduce((s, t) => s + Number(t.dur || 0), 0);
  const byM = {};
  tr.forEach((t) => {
    const m = t.date.slice(0, 7);
    byM[m] = (byM[m] || 0) + Number(t.dur || 0);
  });
  const months = Object.keys(byM).sort();
  const maxM = Math.max(1, ...Object.values(byM));

  return (
    <>
      <StatGrid
        stats={[
          { value: horses.length, label: "Caballos" },
          { value: tr.length, label: "Entrenos" },
          { value: (totMin / 60).toFixed(1) + "h", label: "Horas monta" },
        ]}
      />
      <StatGrid
        stats={[
          { value: avgR, label: "Val. media" },
          { value: health.filter((r) => r.nxt && dU(r.nxt) <= 14).length, label: "Alertas salud", tone: "red" },
        ]}
      />

      {months.length > 0 && (
        <>
          <div className="sh">
            <h2>Horas por mes</h2>
          </div>
          {months.slice(-12).map((m) => {
            const mn = byM[m];
            const hs = (mn / 60).toFixed(1);
            const pct = Math.round((mn / maxM) * 100);
            const nm = new Date(m + "-01T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
            return (
              <div className="mb" key={m}>
                <div className="ml3">
                  <span style={{ textTransform: "capitalize" }}>{nm}</span>
                  <span>{hs}h</span>
                </div>
                <div className="tr">
                  <div className="fi" style={{ width: pct + "%", background: "var(--v)" }} />
                </div>
              </div>
            );
          })}
        </>
      )}

      {horses.length > 1 && (
        <>
          <div className="sh">
            <h2>Por caballo</h2>
          </div>
          {horses.map((h) => {
            const ht = tr.filter((t) => t.hid === h.id);
            if (!ht.length) return null;
            const avgRH = (ht.reduce((s, t) => s + Number(t.rating || 0), 0) / ht.length).toFixed(1);
            const mH = ht.reduce((s, t) => s + Number(t.dur || 0), 0);
            return (
              <div className="xc" style={{ cursor: "pointer" }} key={h.id} onClick={() => navigate(`/horses/${h.id}?tab=entrenos`)}>
                <div className="hp" style={{ width: "34px", height: "34px", fontSize: "1.1rem" }}>
                  {h.photo ? <img src={h.photo.url} alt="" /> : "🐴"}
                </div>
                <div className="xinf">
                  <div className="xl">{h.name}</div>
                  <div className="xm">
                    {ht.length} sesiones · {(mH / 60).toFixed(1)}h
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--vd)" }}>
                    {avgRH}
                  </div>
                  <div style={{ fontSize: ".6rem", color: "var(--gr)" }}>Val. media</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// Ports rStats (public/legacy-app.js:2404-2572). Read-only — no new mutators. The
// permission gate lives in the route (PermissionRoute requires="stats"), not here.
export function StatsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stableId, horses: allHorses, trainings, expenses, stableExpenses, tasks, team, health } = useStableData();

  const fH = searchParams.get("horse") || "";
  const fO = searchParams.get("owner") || "";
  const fS = searchParams.get("from") || "";
  const fE = searchParams.get("to") || "";
  const tab = searchParams.get("tab") || "financiero";

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  }
  function clearFilters() {
    const params = new URLSearchParams(searchParams);
    ["horse", "owner", "from", "to"].forEach((k) => params.delete(k));
    setSearchParams(params, { replace: true });
  }

  const horses = allHorses.filter((h) => !fH || h.id === fH);
  const hIds = new Set(horses.map((h) => h.id));
  const inRange = (date) => (!fS || date >= fS) && (!fE || date <= fE);
  const tr = trainings.filter((t) => hIds.has(t.hid) && inRange(t.date));
  const ex = expenses.filter((e) => hIds.has(e.hid) && inRange(e.date) && (!fO || (e.payer || "").toLowerCase() === fO.toLowerCase()));
  const totIn = ex.filter((e) => expenseCategoryById(e.cat).d === "in").reduce((s, e) => s + Number(e.amount || 0), 0);
  const totOut = ex.filter((e) => expenseCategoryById(e.cat).d === "out").reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendIn = ex
    .filter((e) => expenseCategoryById(e.cat).d === "in" && e.status !== "pagado")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendOut = ex
    .filter((e) => expenseCategoryById(e.cat).d === "out" && e.status !== "pagado")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const cEx = stableExpenses.filter((e) => inRange(e.date)).reduce((s, e) => s + Number(e.amount || 0), 0);

  const allOwners = [];
  allHorses.forEach((h) => {
    ownerListForHorse(h).forEach((o) => {
      const n = (o.name || "").trim();
      if (n && !allOwners.includes(n)) allOwners.push(n);
    });
  });
  allOwners.sort();

  const hasFilters = !!(fH || fO || fS || fE);

  return (
    <div className="view">
      <div className="vh">
        <div>
          <span className="ey">EquiLog</span>
          <h1>Estadísticas</h1>
        </div>
      </div>
      <div className="fb">
        <div className="frow">
          <div className="fcol">
            <label>Caballo</label>
            <select value={fH} onChange={(e) => setParam("horse", e.target.value)}>
              <option value="">Todos los caballos</option>
              {allHorses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="fcol">
            <label>Propietario</label>
            <select value={fO} onChange={(e) => setParam("owner", e.target.value)}>
              <option value="">Todos los propietarios</option>
              {allOwners.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="frow" style={{ marginTop: ".5rem" }}>
          <div className="fcol">
            <label>Desde</label>
            <input type="date" value={fS} onChange={(e) => setParam("from", e.target.value)} />
          </div>
          <div className="fcol">
            <label>Hasta</label>
            <input type="date" value={fE} onChange={(e) => setParam("to", e.target.value)} />
          </div>
          {hasFilters && (
            <button type="button" className="btn btg btsm" onClick={clearFilters}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={(key) => setParam("tab", key)} />

      {tab === "financiero" && (
        <FinancialTab totIn={totIn} totOut={totOut} cEx={cEx} pendIn={pendIn} pendOut={pendOut} horses={horses} ex={ex} navigate={navigate} />
      )}
      {tab === "equipo" && <TeamTab team={team} stableId={stableId} tasks={tasks} fS={fS} fE={fE} />}
      {tab === "caballos" && <HorsesTab horses={horses} tr={tr} health={health} navigate={navigate} />}
    </div>
  );
}
