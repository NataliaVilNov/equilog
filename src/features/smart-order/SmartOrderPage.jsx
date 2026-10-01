import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { td } from "../../lib/date.js";
import { buildSmartOrderDraft } from "./buildDraft.js";
import { SmartOrderReview } from "./SmartOrderReview.jsx";

const EXAMPLE =
  "Mañana Fandango paddock y caminador. A Nerón montarlo suave 30 minutos. A Luna paseo de la mano 20 minutos porque ayer la veterinaria la infiltró del menudillo, coste 200€.";

// Ports rSmartOrder/smartAnalyzeOrder/confirmSmartOrder (public/legacy-app.js:3013-3123).
// The permission gate (canPerm('tasks')||canPerm('health')||canPerm('expenses')) lives in
// the route (PermissionRoute requires={["tasks","health","expenses"]}), not here. The 🎤
// voice-input button is not ported — same scope cut as the training/session-report forms.
export function SmartOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ds = searchParams.get("d") || td();
  const { horses, team, confirmSmartOrderDraft } = useStableData();
  const { isAdmin, myTeamMember, can } = usePermissions();
  const { showToast } = useToast();

  const [date, setDate] = useState(ds);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  function analyze() {
    const trimmed = text.trim();
    if (!trimmed) {
      showToast("Escribe o dicta una orden");
      return;
    }
    setResult(
      buildSmartOrderDraft(trimmed, date, {
        horses,
        team,
        isAdmin,
        myMemberId: myTeamMember ? myTeamMember.id : null,
        canTasks: can("tasks"),
        canHealth: can("health"),
        canExpenses: can("expenses"),
      })
    );
  }

  function updateItem(id, patch) {
    setResult((prev) => (prev ? { ...prev, items: prev.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : prev));
  }

  function clear() {
    setResult({ items: [], noHorsesFound: false });
  }

  function confirm() {
    if (!result || !result.items.length) {
      showToast("No hay nada que crear");
      return;
    }
    const toCreate = result.items.filter((x) => x.checked && x.allowed);
    const created = confirmSmartOrderDraft(toCreate);
    showToast(`Creados ${created} registro${created === 1 ? "" : "s"}`);
    navigate(`/day?d=${date}`);
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(`/day?d=${ds}`)}>
          ←
        </button>
        <h1>Orden inteligente</h1>
      </div>
      <div className="card" style={{ background: "var(--vl)" }}>
        <div style={{ fontSize: ".86rem", color: "var(--vd)", fontWeight: 700, marginBottom: ".25rem" }}>
          Escribe o dicta como si mandaras un WhatsApp
        </div>
        <div style={{ fontSize: ".76rem", color: "var(--gr)" }}>
          La app propondrá tareas, salud y gastos. Revisa antes de crear.
        </div>
      </div>
      <div className="f">
        <label>Fecha por defecto</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="f">
        <label>Orden</label>
        <textarea style={{ minHeight: "160px" }} placeholder={EXAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button className="btn bts btbl" onClick={analyze}>
        Analizar orden
      </button>
      <div style={{ marginTop: ".9rem" }}>
        {result && (
          <SmartOrderReview
            items={result.items}
            noHorsesFound={result.noHorsesFound}
            horses={horses}
            team={team}
            onChangeItem={updateItem}
            onClear={clear}
            onConfirm={confirm}
          />
        )}
      </div>
    </div>
  );
}
