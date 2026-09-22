import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStableData } from "../../../hooks/useStableData.js";
import { useToast } from "../../../hooks/useToast.js";
import { addD, fDL } from "../../../lib/date.js";
import { boardActivityCandidates, boardAssignedHorseIds } from "../boardHelpers.js";
import { EmptyState } from "../../../components/EmptyState.jsx";
import { PendingHorseTray } from "./PendingHorseTray.jsx";
import { ResourceSlot } from "./ResourceSlot.jsx";

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const CONFLICT_MSG = "Este caballo ya tiene otra ubicación en una franja que coincide. ¿Asignarlo de todos modos?";

// Ports rResourceBoard/boardDragHorse/boardDragAssignment/boardDrop/boardClickCell
// (public/legacy-app.js:1424-1447,1405-1409). The "picked horse" tap-to-select state was a
// module-level global (_boardPickedHorse) in legacy; here it's ResourceBoardPage-local
// state passed down to PendingHorseTray/ResourceSlot.
export function ResourceBoardPage({ type, date }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    horses,
    weeklyPlans,
    boardConfig,
    boardAssignments,
    assignBoardHorse,
    moveBoardAssignment,
    removeBoardAssignment,
  } = useStableData();
  const { showToast } = useToast();
  const [picked, setPicked] = useState(null);

  const candidates = boardActivityCandidates(horses, weeklyPlans, type, date);
  const assigned = boardAssignedHorseIds(boardAssignments, type, date);
  const pending = candidates.filter((h) => !assigned.has(h.id));
  const label = type === "walker" ? "caminador" : "paddock";

  function shiftDate(n) {
    const params = new URLSearchParams(searchParams);
    params.set("date", addD(date, n));
    navigate(`/boards?${params.toString()}`);
  }

  function pickHorse(hid) {
    setPicked((prev) => (prev === hid ? null : hid));
    showToast("Caballo seleccionado. Pulsa un hueco libre.");
  }

  function place(resourceId, slotId, position, hid) {
    const horseId = hid || picked;
    if (!horseId) {
      showToast("Selecciona primero un caballo pendiente");
      return;
    }
    const result = assignBoardHorse(horseId, type, date, resourceId, slotId, position);
    if (result.status === "occupied") {
      showToast("Ese hueco ya está ocupado");
      return;
    }
    if (result.status === "conflict") {
      if (!window.confirm(CONFLICT_MSG)) return;
      assignBoardHorse(horseId, type, date, resourceId, slotId, position, { force: true });
    }
    setPicked(null);
    showToast("Caballo colocado");
  }

  function move(assignmentId, resourceId, slotId, position) {
    const result = moveBoardAssignment(assignmentId, type, date, resourceId, slotId, position);
    if (result.status === "occupied") {
      showToast("Ese hueco ya está ocupado");
      return;
    }
    if (result.status === "conflict") {
      if (!window.confirm(CONFLICT_MSG)) return;
      moveBoardAssignment(assignmentId, type, date, resourceId, slotId, position, { force: true });
    }
    showToast("Asignación movida");
  }

  function remove(assignmentId, horseName) {
    if (!window.confirm(`¿Quitar a ${horseName} de este hueco?`)) return;
    removeBoardAssignment(assignmentId);
    showToast("Asignación retirada");
  }

  function clickCell(resourceId, slotId, position, existing) {
    if (existing) {
      const h = horses.find((x) => x.id === existing.hid);
      remove(existing.id, h ? h.name : "este caballo");
      return;
    }
    place(resourceId, slotId, position, null);
  }

  function onDrop(ev, resourceId, slotId, position) {
    ev.preventDefault();
    let data = {};
    try {
      data = JSON.parse(ev.dataTransfer.getData("text/plain") || "{}");
    } catch (e) {}
    if (data.assignmentId) {
      move(data.assignmentId, resourceId, slotId, position);
      return;
    }
    place(resourceId, slotId, position, data.hid);
  }

  return (
    <>
      <div className="board-toolbar">
        <button className="ib" onClick={() => shiftDate(-1)}>
          ←
        </button>
        <div>
          <b>{capitalize(fDL(date))}</b>
          <small>
            {candidates.length} caballo{candidates.length !== 1 ? "s" : ""} con {label} · {pending.length} pendiente
            {pending.length !== 1 ? "s" : ""}
          </small>
        </div>
        <button className="ib" onClick={() => shiftDate(1)}>
          →
        </button>
      </div>

      <PendingHorseTray horses={pending} picked={picked} onPick={pickHorse} />

      {type === "walker" ? (
        !boardConfig.walkers.length ? (
          <EmptyState>No hay caminadores configurados.</EmptyState>
        ) : (
          boardConfig.walkers.map((w) => (
            <section className="resource-card" key={w.id}>
              <div className="resource-title">
                <div>
                  <span className="resource-icon teal">C</span>
                  <div>
                    <h2>{w.name}</h2>
                    <small>{w.capacity} huecos</small>
                  </div>
                </div>
              </div>
              <div className="resource-scroll">
                <table className="resource-board">
                  <thead>
                    <tr>
                      <th>Horario</th>
                      {Array.from({ length: w.capacity }, (_, i) => (
                        <th key={i}>Hueco {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {w.slots.map((s) => (
                      <tr key={s.id}>
                        <th>
                          {s.start}
                          <small>{s.end}</small>
                        </th>
                        {Array.from({ length: w.capacity }, (_, i) => (
                          <ResourceSlot
                            key={i}
                            type={type}
                            date={date}
                            resourceId={w.id}
                            slotId={s.id}
                            position={i}
                            onDropCell={onDrop}
                            onClickCell={clickCell}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )
      ) : !boardConfig.paddocks.length ? (
        <EmptyState>No hay paddocks configurados.</EmptyState>
      ) : (
        <section className="resource-card">
          <div className="resource-title">
            <div>
              <span className="resource-icon amber">P</span>
              <div>
                <h2>Paddocks</h2>
                <small>{boardConfig.paddocks.length} espacios configurados</small>
              </div>
            </div>
          </div>
          <div className="resource-scroll">
            <table className="resource-board paddock-board">
              <thead>
                <tr>
                  <th>Horario</th>
                  {boardConfig.paddocks.map((p) => (
                    <th key={p.id}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boardConfig.paddockSlots.map((s) => (
                  <tr key={s.id}>
                    <th>
                      {s.start}
                      <small>{s.end}</small>
                    </th>
                    {boardConfig.paddocks.map((p) => (
                      <ResourceSlot
                        key={p.id}
                        type={type}
                        date={date}
                        resourceId={p.id}
                        slotId={s.id}
                        position={0}
                        onDropCell={onDrop}
                        onClickCell={clickCell}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="board-legend">
        <span className="ok">Verde: organizado</span>
        <span className="warn">Amarillo: pendiente</span>
        <span className="bad">Rojo: conflicto</span>
        <span className="info">Azul: seleccionable</span>
      </div>
    </>
  );
}
