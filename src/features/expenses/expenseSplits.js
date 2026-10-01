import { expenseCategoryById } from "../../lib/constants.js";

// Ports expSplitsForDisplay/splitAmount/expenseSplitSummary/defaultExpenseSplitsForHorse/
// ownerListForHorse/ownerKeyName/expenseIsOut/settlementCandidateExpenses/calcOwnerSettlement
// (public/legacy-app.js:894-953). All take explicit params instead of reading the global D.

export function expSplitsForDisplay(e) {
  return e && Array.isArray(e.splits) ? e.splits.filter((x) => x && Number(x.pct || 0) > 0) : [];
}

export function splitAmount(total, pct) {
  return Math.round((Number(total) || 0) * (Number(pct) || 0)) / 100;
}

export function expenseSplitSummary(e) {
  const sp = expSplitsForDisplay(e);
  if (!sp.length) return "";
  return sp
    .map((x) => `${x.name || ""} ${Number(x.pct || 0)}% (${splitAmount(e.amount, x.pct).toFixed(2)}€)`)
    .join(" · ");
}

export function defaultExpenseSplitsForHorse(h, e) {
  if (e && Array.isArray(e.splits) && e.splits.length) return e.splits;
  const owners = h && h.owners && h.owners.length ? h.owners : h && h.owner ? [{ nombre: h.owner, pct: 100 }] : [];
  return owners.map((o) => ({ name: o.nombre || "", pct: Number(o.pct || 0) }));
}

export function ownerListForHorse(h) {
  return h && h.owners && h.owners.length
    ? h.owners.map((o) => ({ name: o.nombre || o.name || "", pct: Number(o.pct || 0) }))
    : h && h.owner
    ? [{ name: h.owner, pct: 100 }]
    : [];
}

export function ownerKeyName(n) {
  return (n || "").trim().toLowerCase();
}

export function expenseIsOut(e) {
  return expenseCategoryById(e && e.cat).d === "out";
}

export function settlementCandidateExpenses(expenses, hid, includeSettled = false) {
  return (expenses || []).filter((e) => e.hid === hid && expenseIsOut(e) && (includeSettled || !e.settled));
}

export function calcOwnerSettlement(horse, expenses, ids) {
  const owners = ownerListForHorse(horse);
  const map = {};
  owners.forEach((o) => {
    const k = ownerKeyName(o.name);
    if (k) map[k] = { key: k, name: o.name, pct: o.pct, paid: 0, owed: 0, balance: 0 };
  });
  const warnings = [];
  let total = 0;
  const used = [];
  (expenses || [])
    .filter((e) => ids.includes(e.id))
    .forEach((e) => {
      const amt = Number(e.amount || 0);
      if (!amt || !expenseIsOut(e)) return;
      total += amt;
      used.push(e);
      const payerK = ownerKeyName(e.payer);
      if (map[payerK]) map[payerK].paid += amt;
      else warnings.push(`No encuentro pagador propietario para "${e.concept || "gasto"}" (${e.payer || "sin pagador"}).`);
      let shares = expSplitsForDisplay(e)
        .map((x) => ({ name: x.name, pct: Number(x.pct || 0) }))
        .filter((x) => x.name && x.pct > 0);
      if (!shares.length) shares = owners.map((o) => ({ name: o.name, pct: Number(o.pct || 0) }));
      const sum = shares.reduce((a, b) => a + Number(b.pct || 0), 0);
      if (Math.abs(sum - 100) > 0.5) warnings.push(`El reparto de "${e.concept || "gasto"}" suma ${sum.toFixed(0)}%.`);
      shares.forEach((sh) => {
        const k = ownerKeyName(sh.name);
        const v = splitAmount(amt, sh.pct);
        if (map[k]) map[k].owed += v;
        else warnings.push(`No encuentro propietario "${sh.name}" en el reparto de "${e.concept || "gasto"}".`);
      });
    });
  Object.values(map).forEach((o) => (o.balance = Math.round((o.paid - o.owed) * 100) / 100));
  const debtors = Object.values(map)
    .filter((o) => o.balance < -0.01)
    .map((o) => ({ ...o, amount: -o.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.values(map)
    .filter((o) => o.balance > 0.01)
    .map((o) => ({ ...o, amount: o.balance }))
    .sort((a, b) => b.amount - a.amount);
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const v = Math.round(Math.min(debtors[i].amount, creditors[j].amount) * 100) / 100;
    if (v > 0.01) transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: v });
    debtors[i].amount = Math.round((debtors[i].amount - v) * 100) / 100;
    creditors[j].amount = Math.round((creditors[j].amount - v) * 100) / 100;
    if (debtors[i].amount <= 0.01) i++;
    if (creditors[j].amount <= 0.01) j++;
  }
  return { owners: Object.values(map), warnings, total, used, transfers };
}
