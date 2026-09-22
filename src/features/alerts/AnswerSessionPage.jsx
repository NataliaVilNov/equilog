import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { useToast } from "../../hooks/useToast.js";
import { activityById } from "../../lib/constants.js";
import { fD } from "../../lib/date.js";

// Ports rAns (public/legacy-app.js:2384-2401). Voice dictation is not ported — same
// decision as the training form (docs/components/trainings.md).
export function AnswerSessionPage() {
  const { aid } = useParams();
  const { salerts, answerSessionAlert } = useStableData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const alert = salerts.find((s) => s.id === aid);

  const [state, setState] = useState("");
  const [feel, setFeel] = useState("");
  const [notes, setNotes] = useState("");
  const [dur, setDur] = useState(45);
  const [rating, setRating] = useState(7);

  if (!alert) {
    return (
      <div className="view">
        <p>No encontrada.</p>
      </div>
    );
  }

  const a = activityById(alert.act);

  function handleSubmit() {
    answerSessionAlert(aid, { dur, state: state.trim(), feel: feel.trim(), notes: notes.trim(), rating });
    showToast("Parte guardado y entrenamiento registrado");
    navigate("/alerts");
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate("/alerts")}>
          ←
        </button>
        <h1>Parte de sesión</h1>
      </div>
      <div className="card" style={{ background: "var(--al)", borderColor: "#BFDBFE" }}>
        <div style={{ fontSize: ".82rem", color: "var(--az)", fontWeight: 700 }}>
          {a.i} {a.l} — {alert.hn}
        </div>
        <div style={{ fontSize: ".74rem", color: "var(--gr)", marginTop: ".18rem" }}>{fD(alert.date)}</div>
      </div>
      <div className="f">
        <label>Estado del caballo</label>
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Relajado, nervioso..." />
      </div>
      <div className="f">
        <label>¿Cómo ha ido la sesión?</label>
        <textarea value={feel} onChange={(e) => setFeel(e.target.value)} placeholder="Describe la sesión..." />
      </div>
      <div className="f">
        <label>Observaciones</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algo a destacar..." />
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
        Guardar parte
      </button>
    </div>
  );
}
