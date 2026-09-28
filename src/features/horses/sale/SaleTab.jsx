import { useMemo } from "react";
import { useStableData } from "../../../hooks/useStableData.js";
import { useDebouncedCallback } from "../../../lib/useDebouncedCallback.js";
import { computeSaleLiquidation, SALE_EXPENSE_CATEGORIES, SALE_EXPENSE_CATEGORY_LABELS } from "./saleLiquidation.js";
import { SaleOwnerRow } from "./SaleOwnerRow.jsx";

// Ports the "venta" tab body of rHorse (public/legacy-app.js:1787-1970).
//
// Legacy explicitly treats the horse's own owner list as the sale's "single source of
// truth" (its comments literally say so, public/legacy-app.js:1788,1791) and re-syncs
// `sale.owners` from `horse.owners` on every render whenever the horse has owners set —
// which means editing the sale tab's name/% fields in that case has no lasting effect, since
// the next render immediately overwrites them again. Rather than reproduce that dead
// interactivity, this port locks the owner rows (no edit/add/remove) whenever the horse has
// real owners, and only allows editing sale-specific ad-hoc owners for the edge case of a
// horse with no owners set at all — matching what legacy's sync logic actually lets persist.
// See docs/components/horses.md.
export function SaleTab({ horse }) {
  const { expenses, updateHorseSale } = useStableData();

  const ex = useMemo(
    () => expenses.filter((e) => e.hid === horse.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, horse.id]
  );
  const horseOwners =
    horse.owners && horse.owners.length ? horse.owners : horse.owner ? [{ nombre: horse.owner, pct: 100 }] : [];
  const ownersLocked = horseOwners.length > 0;

  const effectiveHorse = ownersLocked
    ? {
        ...horse,
        sale: {
          ...(horse.sale || { precio: 0 }),
          owners: horseOwners.map((o) => ({ nombre: o.nombre || "", pct: o.pct || 0 })),
        },
      }
    : horse;

  const liquidation = computeSaleLiquidation(effectiveHorse, ex);
  const {
    catTotals,
    totalIngresos,
    totalGastos,
    precioVenta,
    beneficioNeto,
    owners,
    totalPct,
    ownerBreakdown,
    gastosNoAsignados,
    gastosConReparto,
  } = liquidation;

  const debouncedUpdateSale = useDebouncedCallback(updateHorseSale, 250);

  function handlePriceChange(value) {
    debouncedUpdateSale(horse.id, { precio: Number(value) || 0 });
  }
  function handleOwnerName(i, value) {
    if (ownersLocked) return;
    debouncedUpdateSale(horse.id, (sale) => ({
      ...sale,
      owners: sale.owners.map((o, idx) => (idx === i ? { ...o, nombre: value } : o)),
    }));
  }
  function handleOwnerPct(i, value) {
    if (ownersLocked) return;
    debouncedUpdateSale(horse.id, (sale) => ({
      ...sale,
      owners: sale.owners.map((o, idx) => (idx === i ? { ...o, pct: Number(value) || 0 } : o)),
    }));
  }
  function handleAddOwner() {
    if (ownersLocked) return;
    updateHorseSale(horse.id, (sale) => ({ ...sale, owners: [...(sale.owners || []), { nombre: "", pct: 0 }] }));
  }
  function handleRemoveOwner(i) {
    if (ownersLocked) return;
    updateHorseSale(horse.id, (sale) =>
      sale.owners.length <= 1 ? sale : { ...sale, owners: sale.owners.filter((_, idx) => idx !== i) }
    );
  }

  const catRows = SALE_EXPENSE_CATEGORIES.filter((c) => catTotals[c] > 0);
  const pctWarn = Math.abs(totalPct - 100) > 0.01;
  const showLiquidacion = precioVenta > 0 && Math.abs(totalPct - 100) < 0.01;

  return (
    <div className="venta-panel">
      <div className="vblock">
        <div className="vbh">📊 Resumen de gastos</div>
        {catRows.length ? (
          catRows.map((c) => (
            <div className="vr" key={c}>
              <span className="vrl">{SALE_EXPENSE_CATEGORY_LABELS[c]}</span>
              <span className="vrv">{catTotals[c].toFixed(2)}€</span>
            </div>
          ))
        ) : (
          <div className="vr">
            <span className="vrl" style={{ color: "var(--gr)" }}>
              Sin gastos registrados aún
            </span>
            <span className="vrv">0.00€</span>
          </div>
        )}
        {totalIngresos > 0 && (
          <div className="vr" style={{ color: "#2d9e5f" }}>
            <span className="vrl">🏆 Premios / Ingresos</span>
            <span className="vrv">-{totalIngresos.toFixed(2)}€</span>
          </div>
        )}
        <div className="vr vtotal">
          <span className="vrl">Total gastos</span>
          <span className="vrv">{totalGastos.toFixed(2)}€</span>
        </div>
      </div>

      <div className="vblock">
        <div className="vbh">💵 Precio de venta</div>
        <div className="f">
          <label>Precio de venta (€)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={precioVenta || ""}
            placeholder="0"
            onChange={(e) => handlePriceChange(e.target.value)}
            style={{ fontSize: "1.2rem", fontWeight: 800, padding: ".6rem .8rem" }}
          />
        </div>
        {precioVenta > 0 && (
          <>
            <div className="vr">
              <span className="vrl">Precio venta</span>
              <span className="vrv">{precioVenta.toFixed(2)}€</span>
            </div>
            <div className="vr">
              <span className="vrl">Total gastos</span>
              <span className="vrv">-{totalGastos.toFixed(2)}€</span>
            </div>
            <div className={"vr vtotal " + (beneficioNeto >= 0 ? "pos" : "neg")}>
              <span className="vrl">{beneficioNeto >= 0 ? "Beneficio neto" : "Pérdida neta"}</span>
              <span className="vrv">
                {beneficioNeto >= 0 ? "+" : ""}
                {beneficioNeto.toFixed(2)}€
              </span>
            </div>
          </>
        )}
      </div>

      <div className="vblock">
        <div className="vbh">👥 Propietarios y reparto</div>
        {ownersLocked && (
          <p style={{ fontSize: ".72rem", color: "var(--gr)", marginBottom: ".5rem" }}>
            Los propietarios se gestionan desde la ficha del caballo (editar caballo) — aquí solo se muestra el
            reparto.
          </p>
        )}
        <div>
          {ownerBreakdown.map((b, i) => (
            <SaleOwnerRow
              key={i}
              breakdown={b}
              showFinancials={precioVenta > 0}
              canRemove={!ownersLocked && owners.length > 1}
              onNameChange={(v) => handleOwnerName(i, v)}
              onPctChange={(v) => handleOwnerPct(i, v)}
              onRemove={() => handleRemoveOwner(i)}
            />
          ))}
        </div>
        {pctWarn && <div className="vpw">⚠️ Los porcentajes suman {totalPct}% (deben sumar 100%)</div>}
        {gastosNoAsignados > 0 && precioVenta > 0 && (
          <div className="vpw">
            ℹ️ {gastosNoAsignados.toFixed(2)}€ en gastos sin reparto o con reparto no asociado a propietarios. La
            app los imputa por defecto según % de propiedad cuando no hay dato mejor.
          </div>
        )}
        {gastosConReparto > 0 && (
          <div className="vpw" style={{ background: "#EEF6FF", borderColor: "#BFDBFE", color: "#1E3A8A" }}>
            👥 Hay {gastosConReparto.toFixed(2)}€ en gastos con reparto personalizado que se tienen en cuenta en
            esta liquidación.
          </div>
        )}
        {!ownersLocked && (
          <button className="btn bts" style={{ marginTop: ".5rem" }} onClick={handleAddOwner}>
            + Añadir propietario
          </button>
        )}
      </div>

      {showLiquidacion && (
        <div className="vblock vresumen">
          <div className="vbh">🧾 Liquidación final</div>
          <div className="vr" style={{ marginBottom: ".5rem" }}>
            <span className="vrl">Precio venta</span>
            <span className="vrv">{precioVenta.toFixed(2)}€</span>
          </div>
          <div className="vr" style={{ marginBottom: ".5rem" }}>
            <span className="vrl">Total gastos</span>
            <span className="vrv">-{totalGastos.toFixed(2)}€</span>
          </div>
          <div className={"vr vtotal " + (beneficioNeto >= 0 ? "pos" : "neg")} style={{ marginBottom: "1rem" }}>
            <span className="vrl">Beneficio neto</span>
            <span className="vrv">
              {beneficioNeto >= 0 ? "+" : ""}
              {beneficioNeto.toFixed(2)}€
            </span>
          </div>
          {ownerBreakdown.map((b, i) => (
            <div className="vliq" key={i}>
              <div className="vliqn">
                {b.nombre || "Propietario " + (i + 1)} <span className="vliqp">{b.pct}%</span>
              </div>
              <div className="vliqd">
                Parte bruta de venta ({b.pct}%): +{b.ventaBruta.toFixed(2)}€
              </div>
              <div className="vliqd">Gastos asignados según reparto: -{b.gastosAsignados.toFixed(2)}€</div>
              {b.gastosRepartidos > 0 && (
                <div className="vliqd">
                  👥 De ellos, gastos con reparto personalizado: -{b.gastosRepartidos.toFixed(2)}€
                </div>
              )}
              {b.gastosProrrata > 0 && (
                <div className="vliqd">Gastos imputados por % de propiedad: -{b.gastosProrrata.toFixed(2)}€</div>
              )}
              {b.ingresosTeoricos > 0 && (
                <div className="vliqd" style={{ color: "#2d9e5f" }}>
                  🏆 Ingresos/primas ({b.pct}%): +{b.ingresosTeoricos.toFixed(2)}€
                </div>
              )}
              {b.ingresosRecibidos > 0 && (
                <div className="vliqd" style={{ color: "#2d9e5f" }}>
                  🏆 Premios ya cobrados: -{b.ingresosRecibidos.toFixed(2)}€
                </div>
              )}
              <div className={"vliqt " + (b.totalRecibe >= 0 ? "pos" : "neg")}>
                {b.totalRecibe >= 0 ? "+" : ""}
                {b.totalRecibe.toFixed(2)}€
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
