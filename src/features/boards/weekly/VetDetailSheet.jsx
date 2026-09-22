import { useState } from "react";
import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";

// The VET tool's second-tap sheet: writes what happened, saved as a real Health record
// (see WeeklyBoardGrid's vet-save handler, which calls addHealthRecord/updateHealthRecord)
// rather than syncing to an external service like the reference app does. Save is disabled
// until there's non-whitespace text — an empty detail isn't a meaningful health record. No
// character cap, matching the existing unbounded HealthFormPage notes field convention.
export function VetDetailSheet({ initialDetail, onSave, onClose }) {
  const [draft, setDraft] = useState(initialDetail || "");
  const canSave = draft.trim().length > 0;

  return (
    <SlideUpSheet title="Veterinario" onClose={onClose}>
      <div className="f">
        <label>¿Qué ha pasado?</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ej: Revisión por cojera leve en mano izquierda…"
          autoFocus
        />
        <div style={{ fontSize: ".68rem", color: "var(--gr)", marginTop: ".35rem" }}>
          Se guarda como un registro de salud del caballo.
        </div>
      </div>
      <button type="button" className="btn bts btbl" onClick={() => onSave(draft.trim())} disabled={!canSave}>
        Guardar
      </button>
    </SlideUpSheet>
  );
}
