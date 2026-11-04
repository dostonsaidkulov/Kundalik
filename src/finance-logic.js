import { monthKey } from './util.js';

export function monthTotals(tx, key) {
  let income = 0;
  let expense = 0;
  const byCat = {};
  const incByCat = {};
  for (const t of tx) {
    if (!t.date || monthKey(t.date) !== key) continue;
    if (t.type === 'income') {
      income += t.amount || 0;
      incByCat[t.cat] = (incByCat[t.cat] || 0) + (t.amount || 0);
    } else {
      expense += t.amount || 0;
      byCat[t.cat] = (byCat[t.cat] || 0) + (t.amount || 0);
    }
  }
  return { income, expense, balance: income - expense, byCat, incByCat };
}

/** Limit holatini qaytaradi: null | {ratio, spent, limit, level: 'warn'|'over'} */
export function limitState(tx, limits, cat, key) {
  const limit = limits?.[cat];
  if (!limit) return null;
  const spent = monthTotals(tx, key).byCat[cat] || 0;
  const ratio = spent / limit;
  return { ratio, spent, limit, level: ratio > 1 ? 'over' : ratio >= 0.9 ? 'warn' : 'ok' };
}

export function limitAlerts(tx, limits, key) {
  return Object.keys(limits || {})
    .map((cat) => ({ cat, ...(limitState(tx, limits, cat, key) || {}) }))
    .filter((x) => x.level === 'warn' || x.level === 'over')
    .sort((a, b) => b.ratio - a.ratio);
}
