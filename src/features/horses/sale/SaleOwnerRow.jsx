// Ports one owner row of the venta tab (public/legacy-app.js:1895-1910): editable
// name/percentage plus its live computed financial breakdown from computeSaleLiquidation.
// Not the same component as Phase 2's OwnerSplitEditor, which has no per-row computed stats.
export function SaleOwnerRow({ breakdown, showFinancials, canRemove, onNameChange, onPctChange, onRemove }) {
  const {
    nombre,
    pct,
    ventaBruta,
    gastosAsignados,
    gastosRepartidos,
    gastosProrrata,
    ingresosTeoricos,
    ingresosRecibidos,
    totalRecibe,
  } = breakdown;

  return (
    <div className="vo">
      <div className="vor">
        <input
          className="voi"
          placeholder="Nombre propietario"
          value={nombre || ""}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <div className="vop">
          <input
            type="number"
            className="vopi"
            min="0"
            max="100"
            step="1"
            value={pct}
            onChange={(e) => onPctChange(e.target.value)}
          />
          <span>%</span>
        </div>
        {canRemove && (
          <button className="db" onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
      {showFinancials && (
        <div className="vostat">
          <div className="vos">
            <span>💵 Venta ({pct}%)</span>
            <b>+{ventaBruta.toFixed(2)}€</b>
          </div>
          <div className="vos">
            <span>📌 Gastos asignados</span>
            <b>-{gastosAsignados.toFixed(2)}€</b>
          </div>
          {gastosRepartidos > 0 && (
            <div className="vos">
              <span>👥 Gastos repartidos</span>
              <b>-{gastosRepartidos.toFixed(2)}€</b>
            </div>
          )}
          {ingresosTeoricos > 0 && (
            <div className="vos" style={{ color: "#2d9e5f" }}>
              <span>🏆 Ingresos ({pct}%)</span>
              <b>+{ingresosTeoricos.toFixed(2)}€</b>
            </div>
          )}
          {ingresosRecibidos > 0 && (
            <div className="vos" style={{ color: "#2d9e5f" }}>
              <span>🏆 Ya cobrado</span>
              <b>-{ingresosRecibidos.toFixed(2)}€</b>
            </div>
          )}
          <div className={"vos vosn " + (totalRecibe >= 0 ? "pos" : "neg")}>
            <span>✅ Total a recibir</span>
            <b>
              {totalRecibe >= 0 ? "+" : ""}
              {totalRecibe.toFixed(2)}€
            </b>
          </div>
        </div>
      )}
      {showFinancials && gastosProrrata > 0 && (
        <div className="vpw" style={{ marginTop: ".4rem", fontSize: ".7rem" }}>
          ℹ️ {gastosProrrata.toFixed(2)}€ se han imputado por % de propiedad al no tener reparto/pagador claro.
        </div>
      )}
    </div>
  );
}
