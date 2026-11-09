import { Capacitor, registerPlugin } from '@capacitor/core';
import { today, addDays, money, monthKey, PRIORITY } from './util.js';
import { totalBalance } from './accounts.jsx';
import { adviceForDate } from './advice.jsx';
import { monthTotals } from './finance-logic.js';

const Widget = Capacitor.isNativePlatform() ? registerPlugin('KundalikWidget') : null;

/** Bosh ekran vidjeti uchun ma'lumot: balans va keyingi 7 kunning vazifalari hamda nasihati */
export function widgetPayload(db) {
  const live = db.accounts.filter((a) => !a.archived);
  const main = totalBalance(live.filter((a) => a.type !== 'invest'), db.tx);
  const invAcc = live.filter((a) => a.type === 'invest');
  const inv = invAcc.length ? totalBalance(invAcc, db.tx) : 0;
  const t = today();
  const m = monthTotals(db.tx, monthKey(t));
  const days = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, i);
    const list = db.tasks
      .filter((x) => x.status !== 'done' && x.due && x.due <= d)
      .sort((a, b) => (b.due < d) - (a.due < d) || PRIORITY[a.priority || 'mid'].order - PRIORITY[b.priority || 'mid'].order || (a.time || '99').localeCompare(b.time || '99'));
    days[d] = {
      tasks: list.slice(0, 4).map((x) => `${x.due < d ? '⚠ ' : ''}${x.time ? x.time + ' · ' : ''}${x.title}`),
      more: Math.max(0, list.length - 4),
      advice: adviceForDate(db.advice, d)?.text || '',
    };
  }
  return {
    balance: `${money(main)} so'm`,
    inv: inv ? `Investitsiyalar: ${money(inv)} so'm` : '',
    month: `Shu oy chiqim\n${money(m.expense)}`,
    days,
  };
}

let last = '';
export function pushWidget(db) {
  if (!Widget) return;
  try {
    const data = JSON.stringify(widgetPayload(db));
    if (data === last) return;
    last = data;
    Widget.update({ data }).catch(() => {});
  } catch (e) {
    console.warn(e);
  }
}
