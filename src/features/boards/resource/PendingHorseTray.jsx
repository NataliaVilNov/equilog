// Ports the pending-horse tray inside rResourceBoard (public/legacy-app.js:1428).
export function PendingHorseTray({ horses, picked, onPick }) {
  return (
    <div className={"pending-tray " + (horses.length ? "has-pending" : "all-done")}>
      <div>
        <b>{horses.length ? "Pendientes de colocar" : "Pizarra completa"}</b>
        <small>
          {horses.length
            ? "Arrastra un caballo o púlsalo y después toca un hueco libre."
            : "Todos los caballos previstos están colocados."}
        </small>
      </div>
      <div className="pending-list">
        {horses.length ? (
          horses.map((h) => (
            <button
              key={h.id}
              className={"pending-horse" + (picked === h.id ? " selected" : "")}
              draggable="true"
              onDragStart={(ev) => {
                try {
                  ev.dataTransfer.setData("text/plain", JSON.stringify({ hid: h.id }));
                } catch (e) {}
              }}
              onClick={() => onPick(h.id)}
            >
              <span>{h.photo ? <img src={h.photo} alt="" /> : "🐴"}</span>
              {h.name}
            </button>
          ))
        ) : (
          <span className="complete-pill">✓ Todo organizado</span>
        )}
      </div>
    </div>
  );
}
