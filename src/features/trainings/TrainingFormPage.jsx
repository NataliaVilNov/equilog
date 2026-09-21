import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { td } from "../../lib/date.js";
import { WK } from "../../lib/constants.js";

// Ports rNT (public/legacy-app.js:1975-1993). The route-level PermissionRoute("trainings")
// replaces requirePermissionView. The voice-dictation mic button (legacy's voice(),
// public/legacy-app.js:2745, Web Speech API) is intentionally not ported — see
// docs/components/trainings.md known gaps.
export function TrainingFormPage() {
  const { hid } = useParams();
  const { horses, addTraining } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const horse = horses.find((h) => h.id === hid);

  const [date, setDate] = useState(td());
  const [dur, setDur] = useState(45);
  const [wtype, setWtype] = useState("doma");
  const [state, setState] = useState("");
  const [feel, setFeel] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(7);

  if (!horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  function handleBack() {
    navigate(`/horses/${hid}?tab=entrenos`);
  }

  function handleSubmit() {
    addTraining({
      id: uid(),
      createdBy: null,
      hid,
      date,
      dur,
      wtype,
      state: state.trim(),
      feel: feel.trim(),
      notes: notes.trim(),
      rating,
    });
    showToast("Entrenamiento guardado");
    handleBack();
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={handleBack}>
          ←
        </button>
        <h1>Entreno · {horse.name}</h1>
      </div>
      <div className="r2">
        <div className="f">
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f">
          <label>Duración</label>
          <div className="slrow">
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={dur}
              onChange={(e) => setDur(Number(e.target.value))}
            />
            <span className="slv">{dur} min</span>
          </div>
        </div>
      </div>
      <div className="f">
        <label>Tipo de trabajo</label>
        <div className="og og5">
          {WK.map((w) => (
            <div
              key={w.id}
              className={"oo" + (wtype === w.id ? " active" : "")}
              onClick={() => setWtype(w.id)}
            >
              <span className="ic">{w.i}</span>
              {w.l}
            </div>
          ))}
        </div>
      </div>
      <div className="f">
        <label>Estado del caballo</label>
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Relajado, tenso..." />
      </div>
      <div className="f">
        <label>Sensaciones</label>
        <textarea value={feel} onChange={(e) => setFeel(e.target.value)} placeholder="¿Cómo ha ido?" />
      </div>
      <div className="f">
        <label>Observaciones</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles..." />
      </div>
      <div className="f">
        <label>
          Valoración: <span>{rating}</span>/10
        </label>
        <div className="rg">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <div key={n} className={"ro" + (rating === n ? " active" : "")} onClick={() => setRating(n)}>
              {n}
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="btn bts btbl" onClick={handleSubmit}>
        Guardar entrenamiento
      </button>
    </div>
  );
}
