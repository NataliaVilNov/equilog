import { SmartOrderDraftItem } from "./SmartOrderDraftItem.jsx";

// Ports the list-wrapper + footer of renderSmartReview (public/legacy-app.js:3058-3082) and
// the two distinct empty states smartAnalyzeOrder can reach (public/legacy-app.js:3040,3061).
export function SmartOrderReview({ items, noHorsesFound, horses, team, onChangeItem, onClear, onConfirm }) {
  if (noHorsesFound) {
    return (
      <div className="em">
        <p>
          No he reconocido ningún caballo. Prueba con nombre parcial, alias o elige manualmente después; puedes
          añadir alias en la ficha del caballo.
        </p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="em">
        <p>No he encontrado tareas, salud o gastos claros. Prueba con frases más concretas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rpb">
        <h3>He entendido esto</h3>
        {items.map((item) => (
          <SmartOrderDraftItem
            key={item.id}
            item={item}
            horses={horses}
            team={team}
            onToggleChecked={() => onChangeItem(item.id, { checked: !item.checked })}
            onChangeHorse={(hid) => {
              const h = (horses || []).find((x) => x.id === hid);
              if (!h) return;
              onChangeItem(item.id, { hid: h.id, horse: h.name, candidates: [h], uncertain: false });
            }}
            onChangePerson={(pid) => onChangeItem(item.id, { pid: pid || null, personUncertain: false })}
          />
        ))}
      </div>
      <div className="rpa">
        <button className="btn btg" onClick={onClear}>
          Limpiar
        </button>
        <button className="btn bts" onClick={onConfirm}>
          Confirmar y crear
        </button>
      </div>
    </>
  );
}
