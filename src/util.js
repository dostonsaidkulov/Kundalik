export const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
export const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

const pad = (n) => String(n).padStart(2, '0');

export function dateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const today = () => dateStr();
export function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function monthKey(str) {
  return str.slice(0, 7);
}
export function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "Bugun", "Ertaga", "Kecha" yoki "12-noyabr" */
export function fmtDate(str, { withYear = false } = {}) {
  if (!str) return '';
  const t = today();
  if (str === t) return 'Bugun';
  if (str === addDays(t, 1)) return 'Ertaga';
  if (str === addDays(t, -1)) return 'Kecha';
  const d = parseDate(str);
  let s = `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}`;
  if (withYear || d.getFullYear() !== new Date().getFullYear()) s += ` ${d.getFullYear()}`;
  return s;
}
export function fmtLongDate(d = new Date()) {
  return `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}, ${WEEKDAYS[d.getDay()].toLowerCase()}`;
}
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 864e5);
}

export function money(n) {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (v < 0 ? '−' : '') + s;
}
export function parseMoney(str) {
  const digits = String(str || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function norm(s) {
  return String(s || '').toLowerCase().replace(/[ʻʼ‘’`]/g, "'");
}

export const PRIORITY = {
  high: { label: 'Yuqori', order: 0 },
  mid: { label: "O'rta", order: 1 },
  low: { label: 'Past', order: 2 },
};
export const TASK_STATUS = {
  todo: 'Qilinadi',
  doing: 'Jarayonda',
  done: 'Bajarildi',
};
export const IDEA_STATUS = {
  raw: 'Xom fikr',
  thinking: "O'ylanmoqda",
  planned: 'Rejaga aylandi',
};
export const BOOK_STATUS = {
  reading: "O'qiyapman",
  want: "O'qiyman",
  done: "O'qidim",
};
export const REMIND = {
  none: "Yo'q",
  at: 'Vaqtida',
  '1h': '1 soat oldin',
  '1d': '1 kun oldin',
};

export const DEFAULT_SETTINGS = {
  expenseCats: ['Oziq-ovqat', 'Transport', 'Kommunal', 'Uy', 'Kiyim', "Sog'liq", "Ta'lim", 'Dam olish', 'Boshqa'],
  incomeCats: ['Maosh', "Qo'shimcha daromad", "Sovg'a", 'Boshqa'],
  limits: {},
  reading: { on: false, time: '21:00' },
  lessonRemind: { on: true, min: 10 },
};

export const CAT_COLORS = ['#3A63D8', '#12805C', '#C26A12', '#7B4FD0', '#C23B6A', '#1C8DA6', '#8A6D1D', '#5B6B82', '#B4492F', '#4E7A2A'];
export function catColor(name, list = []) {
  const i = list.indexOf(name);
  return CAT_COLORS[(i >= 0 ? i : hashStr(name)) % CAT_COLORS.length];
}

export function planProgress(plan, tasks) {
  const steps = plan.steps || [];
  if (steps.length) {
    const done = steps.filter((s) => stepDone(s, tasks)).length;
    return { done, total: steps.length, ratio: done / steps.length };
  }
  const linked = tasks.filter((t) => t.planId === plan.id);
  if (linked.length) {
    const done = linked.filter((t) => t.status === 'done').length;
    return { done, total: linked.length, ratio: done / linked.length };
  }
  return { done: 0, total: 0, ratio: 0 };
}
export function stepDone(step, tasks) {
  if (step.taskId) {
    const t = tasks.find((x) => x.id === step.taskId);
    if (t) return t.status === 'done';
  }
  return !!step.done;
}

// 50/30/20 qoidasi: har bir chiqim uchta turdan biriga kiradi
export const NATURE = {
  need: { l: 'Zarur', d: 'Usiz yashab bo\'lmaydi: uy, oziq-ovqat, kommunal, ishga yo\'l, dori', target: 50, c: 'var(--c-tasks)' },
  want: { l: 'Xohish', d: 'Usiz ham bo\'ladi: kafe, kiyim-kechak, ko\'ngilochar, sovg\'alar', target: 30, c: 'var(--c-books)' },
  future: { l: 'Kelajak', d: 'Jamg\'arma, qarzni qaytarish, o\'zingizga sarmoya', target: 20, c: 'var(--c-money)' },
};
const DEFAULT_NATURE = {
  'Oziq-ovqat': 'need', Transport: 'need', Kommunal: 'need', Uy: 'need', "Sog'liq": 'need', Komissiya: 'need',
  Kiyim: 'want', 'Dam olish': 'want', Boshqa: 'want', "Ta'lim": 'future',
};
export function natureOf(t, settings) {
  return t.nature || settings?.catNature?.[t.cat] || DEFAULT_NATURE[t.cat] || 'want';
}
export function natureTotals(list, settings) {
  const r = { need: 0, want: 0, future: 0, income: 0, expense: 0 };
  for (const t of list) {
    if (t.type === 'income') r.income += t.amount || 0;
    else if (t.type === 'expense') {
      r.expense += t.amount || 0;
      r[natureOf(t, settings)] += t.amount || 0;
    }
  }
  return r;
}
