import { useState } from "react";
import { SlideUpSheet } from "../../../components/SlideUpSheet.jsx";

// The "Nota" tool's cell sheet: a free-text note for one weekly-plan cell. Guardar persists
// (an empty save deletes the note); Vaciar just clears the draft field — the user still has
// to press Guardar to actually remove an existing note, so clearing isn't instantly
// destructive.
export function NoteSheet({ note, onSave, onClose }) {
  const [draft, setDraft] = useState(note || "");

  return (
    <SlideUpSheet title="Nota" onClose={onClose}>
      <div className="f">
        <label>Nota</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 240))}
          placeholder="Ej: No montar, pequeña herida en la mano…"
          maxLength={240}
          autoFocus
        />
      </div>
      {note ? (
        <div className="r2">
          <button type="button" className="btn btg" onClick={() => setDraft("")}>
            Vaciar
          </button>
          <button type="button" className="btn bts" onClick={() => onSave(draft)}>
            Guardar nota
          </button>
        </div>
      ) : (
        <button type="button" className="btn bts btbl" onClick={() => onSave(draft)}>
          Guardar nota
        </button>
      )}
    </SlideUpSheet>
  );
}
