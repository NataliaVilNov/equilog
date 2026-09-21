import { expenseCategoryById } from "../../../lib/constants.js";
import { expSplitsForDisplay, splitAmount } from "../../expenses/expenseSplits.js";

// Ports the venta/sale computation block of rHorse (public/legacy-app.js:1787-1944) as one
// pure function — the single most complex calculation in the app: per-category expense
// totals, income tracking, and per-owner expense attribution (by split, by payer match, or
// by ownership-% fallback), feeding a final per-owner liquidation.

export const SALE_EXPENSE_CATEGORIES = ["concurso", "pupilaje", "veterinario", "herrajes", "compra", "nomina", "otros"];

export const SALE_EXPENSE_CATEGORY_LABELS = {
  concurso: "Concurso",
  pupilaje: "Pupilaje / Servicio",
  veterinario: "Veterinario",
  herrajes: "Herrador / Herrajes",
  compra: "Compra / Pienso",
  nomina: "Nóminas",
  otros: "Otros",
};

function categoryBucket(cat) {
  if (cat === "concurso" || cat === "entrada") return "concurso";
  if (cat === "pupilaje") return "pupilaje";
  if (cat === "vet" || cat === "salud") return "veterinario";
  if (cat === "herrador" || cat === "herraje") return "herrajes";
  if (cat === "compra" || cat === "pienso") return "compra";
  if (cat === "nomina") return "nomina";
  return "otros";
}

// `expenses` is the list already filtered to this horse (same shape ExpensesTab computes).
export function computeSaleLiquidation(horse, expenses) {
  const catTotals = {};
  SALE_EXPENSE_CATEGORIES.forEach((c) => (catTotals[c] = 0));
  let totalIngresos = 0;
  const ingresosPorPropietario = {};

  expenses.forEach((e) => {
    const ec = expenseCategoryById(e.cat);
    const amt = Number(e.amount || 0);
    if (ec.d !== "out") {
      totalIngresos += amt;
      const cobrador = (e.payee || "").trim().toLowerCase();
      if (cobrador) ingresosPorPropietario[cobrador] = (ingresosPorPropietario[cobrador] || 0) + amt;
      return;
    }
    catTotals[categoryBucket(e.cat)] += amt;
  });

  const totalGastosBruto = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const totalGastos = totalGastosBruto - totalIngresos;
  const precioVenta = Number((horse.sale && horse.sale.precio) || 0);
  const beneficioNeto = precioVenta - totalGastos;
  const owners = (horse.sale && horse.sale.owners) || [{ nombre: "", pct: 100 }];
  const totalPct = Math.round(owners.reduce((s, o) => s + Number(o.pct || 0), 0) * 100) / 100;

  const gastosPorPropietario = {};
  const gastosPorDefecto = {};
  const gastosPorReparto = {};
  owners.forEach((o) => {
    const k = (o.nombre || "").trim().toLowerCase();
    gastosPorPropietario[k] = 0;
    gastosPorDefecto[k] = 0;
    gastosPorReparto[k] = 0;
  });

  let gastosNoAsignados = 0;
  let gastosConReparto = 0;
  expenses.forEach((e) => {
    const ec = expenseCategoryById(e.cat);
    if (ec.d !== "out") return;
    const amt = Number(e.amount || 0);
    const sp = expSplitsForDisplay(e);
    if (sp.length) {
      gastosConReparto += amt;
      sp.forEach((x) => {
        const k = (x.name || "").trim().toLowerCase();
        const v = splitAmount(amt, x.pct);
        if (k && Object.prototype.hasOwnProperty.call(gastosPorPropietario, k)) {
          gastosPorPropietario[k] += v;
          gastosPorReparto[k] += v;
        } else {
          gastosNoAsignados += v;
        }
      });
      return;
    }
    const pagador = (e.payer || "").trim().toLowerCase();
    if (pagador && Object.prototype.hasOwnProperty.call(gastosPorPropietario, pagador)) {
      gastosPorPropietario[pagador] += amt;
    } else {
      owners.forEach((o) => {
        const k = (o.nombre || "").trim().toLowerCase();
        const v = splitAmount(amt, Number(o.pct || 0));
        gastosPorPropietario[k] += v;
        gastosPorDefecto[k] += v;
      });
      gastosNoAsignados += amt;
    }
  });

  const ownerBreakdown = owners.map((o, i) => {
    const pct = Number(o.pct || 0);
    const key = (o.nombre || "").trim().toLowerCase();
    const gastosAsignados = gastosPorPropietario[key] || 0;
    const gastosRepartidos = gastosPorReparto[key] || 0;
    const gastosProrrata = gastosPorDefecto[key] || 0;
    const ingresosRecibidos = ingresosPorPropietario[key] || 0;
    const ventaBruta = (precioVenta * pct) / 100;
    const ingresosTeoricos = (totalIngresos * pct) / 100;
    const totalRecibe = ventaBruta - gastosAsignados + ingresosTeoricos - ingresosRecibidos;
    return {
      index: i,
      nombre: o.nombre,
      pct,
      gastosAsignados,
      gastosRepartidos,
      gastosProrrata,
      ingresosRecibidos,
      ventaBruta,
      ingresosTeoricos,
      totalRecibe,
    };
  });

  return {
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
  };
}
