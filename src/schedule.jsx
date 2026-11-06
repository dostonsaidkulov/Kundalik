import { useEffect, useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Sheet, Field, DeleteButton, Icon, Empty, Chips } from './ui.jsx';
import { hashStr, CAT_COLORS } from './util.js';
import { askPermission, NATIVE } from './notify.js';

// Hafta kunlari: 1 = Dushanba ... 7 = Yakshanba
export const DAYS = [
  { d: 1, s: 'Du', l: 'Dushanba' },
  { d: 2, s: 'Se', l: 'Seshanba' },
  { d: 3, s: 'Ch', l: 'Chorshanba' },
  { d: 4, s: 'Pa', l: 'Payshanba' },
  { d: 5, s: 'Ju', l: 'Juma' },
  { d: 6, s: 'Sh', l: 'Shanba' },
  { d: 7, s: 'Ya', l: 'Yakshanba' },
];
export const KINDS = ["Ma'ruza", 'Amaliy', 'Laboratoriya', 'Seminar'];
export const todayDay = () => ((new Date().getDay() + 6) % 7) + 1;
const toMin = (t) => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const subjColor = (s) => CAT_COLORS[hashStr(s || '') % CAT_COLORS.length];

export function dayLessons(lessons, day) {
  return lessons.filter((l) => l.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** Hozirgi holat: 'past' | 'now' | 'next' | 'later' (faqat bugungi darslar uchun) */
export function lessonState(l, list, nowMin) {
  if (toMin(l.end) <= nowMin) return 'past';
  if (toMin(l.start) <= nowMin) return 'now';
  const next = list.find((x) => toMin(x.start) > nowMin);
  return next && next.id === l.id ? 'next' : 'later';
}

function useNowMin() {
  const get = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [n, setN] = useState(get);
  useEffect(() => {
    const t = setInterval(() => setN(get()), 30000);
    return () => clearInterval(t);
  }, []);
  return n;
}

function LessonCard({ l, state, onClick, nowMin }) {
  const c = subjColor(l.subject);
  let badge = null;
  if (state === 'now') badge = <span className="ls-badge now">Hozir · {toMin(l.end) - nowMin} daq qoldi</span>;
  else if (state === 'next') {
    const m = toMin(l.start) - nowMin;
    badge = <span className="ls-badge next">{m < 60 ? `${m} daqiqadan keyin` : m % 60 ? `${Math.floor(m / 60)} soat ${m % 60} daqiqadan keyin` : `${m / 60} soatdan keyin`}</span>;
  }
  return (
    <button className={'lesson ' + (state || '')} style={{ '--lc': c }} onClick={onClick}>
      <div className="ls-time">
        <b>{l.start}</b>
        <span>{l.end}</span>
      </div>
      <div className="ls-main">
        {badge}
        <div className="ls-subj">{l.subject}</div>
        <div className="ls-meta">
          <span className="ls-group"><Icon name="users" size={14} /> {l.group}</span>
          {l.room && <span><Icon name="door" size={14} /> {l.room}</span>}
          {l.kind && <span className="ls-kind">{l.kind}</span>}
        </div>
        {l.note && <div className="ls-note">{l.note}</div>}
      </div>
    </button>
  );
}

export function Schedule({ day, setDay }) {
  const db = useData();
  const app = useApp();
  const nowMin = useNowMin();
  const td = todayDay();
  const d = day || td;
  const list = dayLessons(db.lessons, d);
  const showSun = db.lessons.some((l) => l.day === 7) || td === 7;
  const days = DAYS.filter((x) => x.d !== 7 || showSun);
  const weekCount = db.lessons.length;
  const groups = [...new Set(db.lessons.map((l) => l.group).filter(Boolean))];
  return (
    <>
      <div className="day-tabs" role="tablist" aria-label="Hafta kunlari">
        {days.map((x) => {
          const n = db.lessons.filter((l) => l.day === x.d).length;
          return (
            <button key={x.d} role="tab" aria-selected={d === x.d} className={'day-tab' + (d === x.d ? ' on' : '') + (x.d === td ? ' today' : '')} onClick={() => setDay(x.d)}>
              <span>{x.s}</span>
              <i>{n || ''}</i>
            </button>
          );
        })}
      </div>
      <div className="day-head">
        <h3>{DAYS[d - 1].l}{d === td ? ' · bugun' : ''}</h3>
        <span>{list.length ? `${list.length} ta dars` : ''}</span>
      </div>
      {list.length === 0 ? (
        <Empty icon="calendar" title={weekCount ? "Bu kuni dars yo'q" : "Dars jadvali bo'sh"} text={weekCount ? null : "Darslaringizni bir marta kiritib qo'ying: fan, guruh va vaqt. Bosh sahifada bugungi darslar ko'rinib turadi, har biridan oldin eslatma keladi."} />
      ) : (
        <div className="lessons">
          {list.map((l) => (
            <LessonCard key={l.id} l={l} nowMin={nowMin} state={d === td ? lessonState(l, list, nowMin) : ''} onClick={() => app.openSheet('lesson', { id: l.id })} />
          ))}
        </div>
      )}
      <button className="add-row" onClick={() => app.openSheet('lesson', { preset: { days: [d] } })}><Icon name="plus" size={18} /> {DAYS[d - 1].l} kuniga dars qo'shish</button>
      {groups.length > 0 && (
        <p className="muted small center groups-line">Guruhlar: {groups.join(', ')} · haftasiga {weekCount} ta dars</p>
      )}
    </>
  );
}

export function TodayLessons() {
  const db = useData();
  const app = useApp();
  const nowMin = useNowMin();
  if (!db.lessons.length) return null;
  const td = todayDay();
  const list = dayLessons(db.lessons, td);
  const left = list.filter((l) => toMin(l.end) > nowMin);
  let tomorrow = null;
  if (!left.length) {
    for (let i = 1; i <= 7; i++) {
      const dd = ((td - 1 + i) % 7) + 1;
      const ls = dayLessons(db.lessons, dd);
      if (ls.length) {
        tomorrow = { day: dd, first: ls[0], n: ls.length, i };
        break;
      }
    }
  }
  return (
    <section className="card today-lessons" style={{ '--sc': 'var(--c-tasks)' }}>
      <div className="card-head">
        <span className="card-ic"><Icon name="calendar" size={18} /></span>
        <h2>Bugungi darslar</h2>
        <span className="card-meta">{list.length ? `${list.length - left.length}/${list.length} o'tildi` : ''}</span>
        <button className="link" onClick={() => app.go('tasks', 'schedule')}>Jadval</button>
      </div>
      {left.length ? (
        <div className="lessons compact">
          {left.slice(0, 3).map((l) => (
            <LessonCard key={l.id} l={l} nowMin={nowMin} state={lessonState(l, list, nowMin)} onClick={() => app.openSheet('lesson', { id: l.id })} />
          ))}
        </div>
      ) : (
        <div className="calm">
          {list.length ? 'Bugungi darslar tugadi. ' : 'Bugun dars yo\'q. '}
          {tomorrow && `${tomorrow.i === 1 ? 'Ertaga' : DAYS[tomorrow.day - 1].l} ${tomorrow.n} ta dars, birinchisi ${tomorrow.first.start} da: ${tomorrow.first.subject}, ${tomorrow.first.group}.`}
        </div>
      )}
    </section>
  );
}

export function LessonSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.lessons.find((l) => l.id === id);
  const [f, setF] = useState({ days: old ? [old.day] : preset.days || [todayDay()], start: '08:30', end: '09:50', subject: '', group: '', room: '', kind: '', note: '', ...(old || {}) });
  const [endTouched, setEndTouched] = useState(!!old);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e && e.target ? e.target.value : e }));
  const subjects = [...new Set(db.lessons.map((l) => l.subject).filter(Boolean))];
  const groups = [...new Set(db.lessons.map((l) => l.group).filter(Boolean))];
  const rooms = [...new Set(db.lessons.map((l) => l.room).filter(Boolean))];
  const ok = f.subject.trim() && f.group.trim() && f.start && f.end && f.days.length && toMin(f.end) > toMin(f.start);
  const toggleDay = (d) => setF((s) => ({ ...s, days: old ? [d] : s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() }));
  const onStart = (e) => {
    const v = e.target.value;
    setF((s) => ({ ...s, start: v, end: endTouched ? s.end : fromMin(toMin(v) + 80) }));
  };
  const save = async () => {
    if (!ok) return;
    const data = { start: f.start, end: f.end, subject: f.subject.trim(), group: f.group.trim(), room: f.room.trim(), kind: f.kind || '', note: f.note || '' };
    if (old) db.update('lessons', id, { ...data, day: f.days[0] });
    else f.days.forEach((d) => db.add('lessons', { ...data, day: d }));
    app.closeSheet();
    app.toast(old ? 'Dars saqlandi' : f.days.length > 1 ? `${f.days.length} kunga dars qo'shildi` : "Dars qo'shildi");
    if (!old && NATIVE && db.settings.lessonRemind?.on !== false) await askPermission();
  };
  const conflicts = db.lessons.filter((l) => l.id !== id && f.days.includes(l.day) && toMin(l.start) < toMin(f.end) && toMin(f.start) < toMin(l.end));
  return (
    <Sheet title={old ? 'Dars' : 'Yangi dars'} onClose={app.closeSheet}
      footer={<>
        <div className="foot-left">{old && <DeleteButton onDelete={() => { db.remove('lessons', id); app.closeSheet(); app.toast("Dars o'chirildi"); }} />}</div>
        <button type="button" className="btn primary" onClick={save} disabled={!ok}>Saqlash</button>
      </>}>
      <Field label="Fan nomi" htmlFor="l-subj">
        <input id="l-subj" list="l-subjects" value={f.subject} onChange={set('subject')} placeholder="Masalan: Polimerlar fizikasi" />
        <datalist id="l-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <div className="grid2">
        <Field label="Guruh" htmlFor="l-group">
          <input id="l-group" list="l-groups" value={f.group} onChange={set('group')} placeholder="Masalan: 301-21" />
          <datalist id="l-groups">{groups.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Xona (ixtiyoriy)" htmlFor="l-room">
          <input id="l-room" list="l-rooms" value={f.room} onChange={set('room')} placeholder="Masalan: 214" />
          <datalist id="l-rooms">{rooms.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
      </div>
      <Field label={old ? 'Kuni' : 'Kunlari (bir nechtasini tanlash mumkin)'}>
        <div className="day-pick">
          {DAYS.map((x) => (
            <button key={x.d} type="button" className={f.days.includes(x.d) ? 'on' : ''} onClick={() => toggleDay(x.d)} aria-pressed={f.days.includes(x.d)} aria-label={x.l}>{x.s}</button>
          ))}
        </div>
      </Field>
      <div className="grid2 keep">
        <Field label="Boshlanishi" htmlFor="l-start">
          <input id="l-start" type="time" value={f.start} onChange={onStart} />
        </Field>
        <Field label="Tugashi" htmlFor="l-end" hint={!endTouched ? '1 juftlik = 80 daqiqa' : null}>
          <input id="l-end" type="time" value={f.end} onChange={(e) => { setEndTouched(true); set('end')(e); }} />
        </Field>
      </div>
      {toMin(f.end) <= toMin(f.start) && <div className="alert over">Tugash vaqti boshlanishdan keyin bo'lishi kerak.</div>}
      {conflicts.length > 0 && <div className="alert warn"><span>Bu vaqtda boshqa dars bor: {conflicts[0].subject}, {conflicts[0].group} ({DAYS[conflicts[0].day - 1].l}, {conflicts[0].start})</span></div>}
      <Field label="Dars turi (ixtiyoriy)">
        <Chips options={[...KINDS]} value={f.kind} onChange={(v) => setF((s) => ({ ...s, kind: s.kind === v ? '' : v }))} />
      </Field>
      <Field label="Izoh" htmlFor="l-note">
        <input id="l-note" value={f.note} onChange={set('note')} placeholder="Masalan: toq haftalarda" />
      </Field>
    </Sheet>
  );
}
