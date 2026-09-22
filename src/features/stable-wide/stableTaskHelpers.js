import { td, dU } from "../../lib/date.js";

// Ports cDue() (public/legacy-app.js:1044-1052): which recurring stable-wide tasks are due
// today, based on frequency and last-done date.
export function ctasksDueToday(ctasks) {
  return (ctasks || []).filter((t) => {
    if (t.freq === "diaria") return true;
    if (t.freq === "puntual") return t.date === td();
    if (t.freq === "semanal") return !t.ld || dU(t.ld) <= -7;
    if (t.freq === "mensual") return !t.ld || dU(t.ld) <= -28;
    return false;
  });
}
