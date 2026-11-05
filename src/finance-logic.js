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

export function yearTotals(tx, year) {
  const y = String(year);
  let income = 0;
  let expense = 0;
  const byCat = {};
  const incByCat = {};
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const t of tx) {
    if (!t.date || t.date.slice(0, 4) !== y) continue;
    const mi = Number(t.date.slice(5, 7)) - 1;
    const v = t.amount || 0;
    if (t.type === 'income') {
      income += v;
      incByCat[t.cat] = (incByCat[t.cat] || 0) + v;
      months[mi].income += v;
    } else {
      expense += v;
      byCat[t.cat] = (byCat[t.cat] || 0) + v;
      months[mi].expense += v;
    }
  }
  return { income, expense, balance: income - expense, byCat, incByCat, months };
}

// Ro'yxat matnini mahsulotlarga ajratadi: "1. Non 2 ta\n- Sut" yoki "non, sut, tuxum"
const QTY = /^(.*?)[\s:,–-]+(\d+(?:[.,]\d+)?\s*(?:kg|kilo|g|gr|gramm|l|litr|ml|ta|dona|quti|paket|pachka|bog'?|bank[ae]?|shisha)?\.?)$/i;
export function parseItem(line) {
  const s = line
    .replace(/^\s*(?:\d+\s*[.)\-:]|[-–—•*·▪●◦✓✔☐☑]|\[\s?[xX ]?\s?\])\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;
  const m = s.match(QTY);
  if (m && m[1].trim()) return { name: cap(m[1].trim()), qty: m[2].trim() };
  return { name: cap(s), qty: '' };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function parseShopList(text) {
  let parts = String(text || '').split(/\r?\n/);
  if (parts.filter((p) => p.trim()).length <= 1) parts = String(text || '').split(/[,;]/);
  return parts.map(parseItem).filter(Boolean);
}
