import { fD } from "../../lib/date.js";
import { activityById } from "../../lib/constants.js";

const fieldLabelStyle = {
  fontSize: ".68rem",
  color: "var(--gr)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".06em",
};
const selectStyle = { width: "100%", margin: ".18rem 0 .45rem 0", fontSize: ".78rem", padding: ".38rem .55rem" };

// Ports one row of renderSmartReview (public/legacy-app.js:3058-3082) plus
// smartChangeHorse/smartChangePerson (public/legacy-app.js:3083-3094). Legacy renders this
// row with inline styles rather than dedicated CSS classes, so the port keeps that instead
// of inventing new stylesheet classes.
export function SmartOrderDraftItem({ item, horses, team, onToggleChecked, onChangeHorse, onChangePerson }) {
  const icon = item.kind === "task" ? "📋" : item.kind === "health" ? "🩺" : "💰";
  const title =
    item.kind === "task"
      ? `${activityById(item.activity).l} · ${item.dur || 30} min`
      : item.kind === "health"
      ? item.label
      : `${item.concept} · ${Number(item.amount || 0).toFixed(2)}€`;
  const person = item.pid ? (team || []).find((m) => m.id === item.pid) : null;
  const personName = item.pid ? (person ? person.name : "Sin asignar") : "Sin asignar";

  return (
    <label
      style={{
        display: "flex",
        gap: ".55rem",
        alignItems: "flex-start",
        borderBottom: "1px solid var(--li)",
        padding: ".55rem 0",
        textTransform: "none",
        letterSpacing: 0,
        fontSize: ".82rem",
        color: "var(--ti)",
        fontWeight: 600,
      }}
    >
      <input
        type="checkbox"
        checked={!!item.checked && item.allowed}
        disabled={!item.allowed}
        onChange={onToggleChecked}
        style={{ width: "auto", marginTop: ".2rem" }}
      />
      <span style={{ flex: 1 }}>
        <b>
          {icon} {item.horse}
        </b>
        {item.uncertain && <span style={{ color: "var(--am)", fontSize: ".7rem" }}> ¿seguro?</span>}
        <br />
        <span style={fieldLabelStyle}>Caballo</span>
        <br />
        <select value={item.hid} onChange={(e) => onChangeHorse(e.target.value)} style={selectStyle}>
          {(horses || []).map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        {item.kind === "task" && (
          <>
            <span style={fieldLabelStyle}>
              Quién lo hace
              {item.personUncertain && <span style={{ color: "var(--am)", textTransform: "none", letterSpacing: 0 }}> ¿seguro?</span>}
            </span>
            <br />
            <select value={item.pid || ""} onChange={(e) => onChangePerson(e.target.value)} style={selectStyle}>
              <option value="">Sin asignar</option>
              {(team || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {(m.emoji || "👤") + " " + m.name}
                </option>
              ))}
            </select>
          </>
        )}
        <span style={{ color: "var(--gr)", fontWeight: 500 }}>
          {fD(item.date)} · {title}
          {item.kind === "task" ? ` · ${personName}` : item.kind === "expense" ? ` · ${item.payee || "Proveedor no indicado"}` : ""}
        </span>
        {!item.allowed && (
          <>
            <br />
            <span style={{ color: "var(--ro)" }}>Sin permiso para crear este tipo de registro</span>
          </>
        )}
      </span>
    </label>
  );
}
