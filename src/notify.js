import { Capacitor } from '@capacitor/core';
import { hashStr, parseDate, addDays } from './util.js';

export const NATIVE = Capacitor.isNativePlatform();

let LN = null;
async function ln() {
  if (!LN) LN = (await import('@capacitor/local-notifications')).LocalNotifications;
  return LN;
}

/** 'granted' | 'denied' | 'prompt' | 'web' */
export async function permissionState() {
  if (!NATIVE) return 'web';
  try {
    const p = await (await ln()).checkPermissions();
    return p.display;
  } catch {
    return 'denied';
  }
}
export async function askPermission() {
  if (!NATIVE) return 'web';
  try {
    const L = await ln();
    let p = await L.checkPermissions();
    if (p.display !== 'granted') p = await L.requestPermissions();
    return p.display;
  } catch {
    return 'denied';
  }
}

function at(dateStr, time) {
  const d = parseDate(dateStr);
  const [h, m] = (time || '09:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
const nid = (key) => (hashStr(key) % 2000000000) + 10;

export function taskReminderTime(t) {
  if (!t.due || !t.remind || t.remind === 'none') return null;
  const base = at(t.due, t.time);
  if (t.remind === '1h') return base - 3600e3;
  if (t.remind === '1d') return base - 864e5;
  return base;
}

export async function syncReminders({ tasks, plans, books, debts = [], lessons = [], settings }) {
  if (!NATIVE) return;
  const L = await ln();
  const perm = await L.checkPermissions();
  if (perm.display !== 'granted') return;

  const pending = await L.getPending();
  if (pending.notifications.length) {
    await L.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }

  const now = Date.now();
  const horizon = now + 60 * 864e5;
  const list = [];

  for (const t of tasks) {
    if (t.status === 'done') continue;
    const when = taskReminderTime(t);
    if (!when || when <= now || when > horizon) continue;
    const body = t.remind === '1d' ? 'Ertaga muddati tugaydi' : t.remind === '1h' ? '1 soatdan keyin muddati tugaydi' : 'Vazifa vaqti keldi';
    list.push({ id: nid('t' + t.id), title: t.title, body, schedule: { at: new Date(when), allowWhileIdle: true }, extra: { go: 'tasks' } });
  }
  for (const p of plans) {
    if (!p.deadline) continue;
    const dayBefore = at(addDays(p.deadline, -1), '09:00');
    const onDay = at(p.deadline, '09:00');
    if (dayBefore > now && dayBefore < horizon)
      list.push({ id: nid('pb' + p.id), title: 'Reja muddati ertaga', body: p.title, schedule: { at: new Date(dayBefore), allowWhileIdle: true }, extra: { go: 'thoughts' } });
    if (onDay > now && onDay < horizon)
      list.push({ id: nid('pd' + p.id), title: 'Reja muddati bugun', body: p.title, schedule: { at: new Date(onDay), allowWhileIdle: true }, extra: { go: 'thoughts' } });
  }
  for (const d of debts) {
    const left = (d.amount || 0) - (d.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
    if (!d.due || d.remind === false || d.closed || left <= 0) continue;
    const sum = String(Math.round(left)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const body = d.dir === 'lent' ? `${d.person} sizga ${sum} so'm qaytarishi kerak` : `${d.person}ga ${sum} so'm qaytarishingiz kerak`;
    const dayBefore = at(addDays(d.due, -1), '09:00');
    const onDay = at(d.due, '09:00');
    if (dayBefore > now && dayBefore < horizon)
      list.push({ id: nid('db' + d.id), title: 'Qarz muddati ertaga', body, schedule: { at: new Date(dayBefore), allowWhileIdle: true }, extra: { go: 'money' } });
    if (onDay > now && onDay < horizon)
      list.push({ id: nid('dd' + d.id), title: 'Qarz muddati bugun', body, schedule: { at: new Date(onDay), allowWhileIdle: true }, extra: { go: 'money' } });
  }
  list.sort((a, b) => a.schedule.at - b.schedule.at);
  const out = list.slice(0, 60);

  if (settings.reading?.on) {
    const [hour, minute] = (settings.reading.time || '21:00').split(':').map(Number);
    const book = books.find((b) => b.status === 'reading');
    out.push({
      id: 1,
      title: "Kitob o'qish vaqti",
      body: book ? `«${book.title}», ${book.page || 0}-betdan davom eting` : 'Bugun bir necha bet o\'qing',
      schedule: { on: { hour, minute }, allowWhileIdle: true },
      extra: { go: 'books' },
    });
  }
  // Har haftalik dars eslatmalari (Capacitor: 1 = Yakshanba, 2 = Dushanba ...)
  const lr = settings.lessonRemind || { on: true, min: 10 };
  if (lr.on) {
    for (const l of lessons) {
      const [h, m] = (l.start || '08:00').split(':').map(Number);
      let t = h * 60 + m - (Number(lr.min) || 0);
      let day = l.day;
      if (t < 0) {
        t += 1440;
        day = day === 1 ? 7 : day - 1;
      }
      out.push({
        id: nid('l' + l.id),
        title: `${l.start} · ${l.subject}`,
        body: `${l.group}${l.room ? ', ' + l.room + '-xona' : ''}${l.kind ? ' · ' + l.kind : ''}`,
        schedule: { on: { weekday: (day % 7) + 1, hour: Math.floor(t / 60), minute: t % 60 }, allowWhileIdle: true },
        extra: { go: 'tasks' },
      });
    }
  }
  if (out.length) await L.schedule({ notifications: out });
}

export async function notifyNow(title, body) {
  if (!NATIVE) return;
  try {
    const L = await ln();
    const p = await L.checkPermissions();
    if (p.display !== 'granted') return;
    await L.schedule({ notifications: [{ id: nid('now' + Date.now()), title, body, schedule: { at: new Date(Date.now() + 500) } }] });
  } catch (e) {
    console.warn(e);
  }
}

export async function onNotificationTap(cb) {
  if (!NATIVE) return;
  const L = await ln();
  L.addListener('localNotificationActionPerformed', (e) => cb(e.notification?.extra?.go));
}
