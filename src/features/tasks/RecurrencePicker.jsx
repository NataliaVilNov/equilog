import { weekdayCode, nthWeekdayOfMonth } from "../../lib/recurrence.js";

const WEEKDAYS = [
  { code: "MO", label: "L" },
  { code: "TU", label: "M" },
  { code: "WE", label: "X" },
  { code: "TH", label: "J" },
  { code: "FR", label: "V" },
  { code: "SA", label: "S" },
  { code: "SU", label: "D" },
];

const FREQ_OPTIONS = [
  { id: "none", label: "No se repite" },
  { id: "daily", label: "Diaria" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensual" },
];

const END_OPTIONS = [
  { id: "never", label: "Nunca" },
  { id: "until", label: "Hasta una fecha" },
  { id: "count", label: "Tras N veces" },
];

function ordinalLabel(n) {
  if (n < 0) return "último";
  return ["1º", "2º", "3º", "4º", "5º"][n - 1] || `${n}º`;
}

// Controlled: `value` is a recurrenceRule shaped for src/lib/recurrence.js (or null for a
// one-off task), `onChange` receives the next rule or null. `startDate` supplies the anchor
// day used to pre-fill weekday/day-of-month defaults when a mode is first selected.
export function RecurrencePicker({ value, onChange, startDate }) {
  const freq = value ? value.freq : "none";
  const interval = value ? value.interval || 1 : 1;
  const byWeekday = value && value.byWeekday ? value.byWeekday : [];
  const monthlyMode = value && value.byMonthDay ? "day" : "weekday";
  const endMode = value ? (value.until ? "until" : value.count ? "count" : "never") : "never";

  function emit(patch) {
    onChange({ ...value, ...patch });
  }

  function setFreq(nextFreq) {
    if (nextFreq === "none") {
      onChange(null);
      return;
    }
    onChange({
      freq: nextFreq,
      interval,
      byWeekday: nextFreq === "weekly" ? (startDate ? [weekdayCode(startDate)] : []) : null,
      bySetPos: null,
      byMonthDay: nextFreq === "monthly" ? (startDate ? new Date(startDate + "T12:00:00").getDate() : 1) : null,
      until: value ? value.until : null,
      count: value ? value.count : null,
    });
  }

  function toggleWeekday(code) {
    const next = byWeekday.includes(code) ? byWeekday.filter((c) => c !== code) : [...byWeekday, code];
    emit({ byWeekday: next });
  }

  function setMonthlyMode(mode) {
    if (mode === "day") {
      emit({ byMonthDay: startDate ? new Date(startDate + "T12:00:00").getDate() : 1, byWeekday: null, bySetPos: null });
    } else {
      emit({
        byMonthDay: null,
        byWeekday: startDate ? [weekdayCode(startDate)] : [],
        bySetPos: startDate ? nthWeekdayOfMonth(startDate) : 1,
      });
    }
  }

  function setEndMode(mode) {
    if (mode === "never") emit({ until: null, count: null });
    else if (mode === "until") emit({ until: startDate, count: null });
    else emit({ until: null, count: 5 });
  }

  const weekdayLabel = startDate ? WEEKDAYS.find((w) => w.code === weekdayCode(startDate)) : null;

  return (
    <div className="f">
      <label>Repetición</label>
      <div className="og og4">
        {FREQ_OPTIONS.map((o) => (
          <div key={o.id} className={"oo" + (freq === o.id ? " active" : "")} onClick={() => setFreq(o.id)}>
            {o.label}
          </div>
        ))}
      </div>

      {freq !== "none" && (
        <>
          <div className="f">
            <label>Cada</label>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <input
                type="number"
                min="1"
                max="30"
                value={interval}
                onChange={(e) => emit({ interval: Math.max(1, Number(e.target.value) || 1) })}
                style={{ width: "60px" }}
              />
              <span style={{ fontSize: ".82rem", color: "var(--gr)" }}>
                {freq === "daily" ? "día(s)" : freq === "weekly" ? "semana(s)" : "mes(es)"}
              </span>
            </div>
          </div>

          {freq === "weekly" && (
            <div className="f">
              <label>Días de la semana</label>
              <div className="pch">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w.code}
                    className={"pc" + (byWeekday.includes(w.code) ? " active" : "")}
                    onClick={() => toggleWeekday(w.code)}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {freq === "monthly" && (
            <div className="f">
              <label>Cuándo</label>
              <div className="pch">
                <div
                  className={"pc" + (monthlyMode === "day" ? " active" : "")}
                  onClick={() => setMonthlyMode("day")}
                >
                  El día {startDate ? new Date(startDate + "T12:00:00").getDate() : ""} de cada mes
                </div>
                <div
                  className={"pc" + (monthlyMode === "weekday" ? " active" : "")}
                  onClick={() => setMonthlyMode("weekday")}
                >
                  {startDate
                    ? `El ${ordinalLabel(nthWeekdayOfMonth(startDate))} ${weekdayLabel ? weekdayLabel.label : ""} del mes`
                    : "Por día de la semana"}
                </div>
              </div>
            </div>
          )}

          <div className="f">
            <label>Termina</label>
            <div className="pch">
              {END_OPTIONS.map((o) => (
                <div key={o.id} className={"pc" + (endMode === o.id ? " active" : "")} onClick={() => setEndMode(o.id)}>
                  {o.label}
                </div>
              ))}
            </div>
          </div>

          {endMode === "until" && (
            <div className="f">
              <label>Fecha final</label>
              <input type="date" value={(value && value.until) || ""} onChange={(e) => emit({ until: e.target.value })} />
            </div>
          )}

          {endMode === "count" && (
            <div className="f">
              <label>Número de repeticiones</label>
              <input
                type="number"
                min="1"
                max="365"
                value={(value && value.count) || 5}
                onChange={(e) => emit({ count: Math.max(1, Number(e.target.value) || 1) })}
                style={{ width: "80px" }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
