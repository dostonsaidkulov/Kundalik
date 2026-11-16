import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Icon, Sheet, Field, Segmented, Empty, DeleteButton, TagInput } from './ui.jsx';
import { today, addDays, parseDate, monthKey, shiftMonth, monthLabel, fmtDate, fmtLongDate, dateStr, norm, MONTHS, WEEKDAYS } from './util.js';

/* ================= Kundalik (shaxsiy kundalik / diary) ================= */

export const MOODS = [
  { v: 1, e: '😞', l: 'Yomon', c: '#D2493F' },
  { v: 2, e: '😕', l: 'Past', c: '#D9822B' },
  { v: 3, e: '😐', l: "O'rtacha", c: '#8A93A1' },
  { v: 4, e: '🙂', l: 'Yaxshi', c: '#3A9E6E' },
  { v: 5, e: '😄', l: 'Ajoyib', c: '#12805C' },
];
export const moodOf = (v) => MOODS.find((m) => m.v === v);
const WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const pad = (n) => String(n).padStart(2, '0');

export const firstLine = (t) =>
  String(t || '')
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean) || '';
export const diaryTitle = (e) => e.title || firstLine(e.text).slice(0, 80) || 'Nomsiz yozuv';
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fullDate = (str) => {
  if (!str) return '';
  const d = parseDate(str);
  return `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()].toLowerCase()}`;
};
export const diarySort = (a, b) =>
  (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || '') || (b.createdAt || 0) - (a.createdAt || 0);

/** Necha kun ketma-ket yozilgan (bugun hali yozilmagan bo'lsa, kechadan sanaladi) */
export function diaryStreak(list) {
  const days = new Set(list.map((e) => e.date));
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Qidiruv: matn, sarlavha, teg (#teg), sana ("12-noyabr", "noyabr 2026") va kayfiyat bo'yicha */
function matches(e, q) {
  if (!q) return true;
  if (q.startsWith('#')) {
    const t = q.slice(1);
    return (e.tags || []).some((x) => norm(x).includes(t));
  }
  const m = moodOf(e.mood);
  return [e.title, e.text, (e.tags || []).join(' '), fmtDate(e.date, { withYear: true }), e.date, monthLabel(monthKey(e.date || '2000-01')), m ? m.l : ''].some((x) =>
    norm(x).includes(q),
  );
}

function snippet(text, q) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!q || q.startsWith('#')) return t.slice(0, 220);
  const i = norm(t).indexOf(q);
  if (i < 0) return t.slice(0, 220);
  const a = Math.max(0, i - 60);
  return [(a > 0 ? '…' : '') + t.slice(a, i), <mark key="m">{t.slice(i, i + q.length)}</mark>, t.slice(i + q.length, i + q.length + 160)];
}

function DiaryItem({ e, q }) {
  const app = useApp();
  const d = e.date ? parseDate(e.date) : new Date();
  const m = moodOf(e.mood);
  const title = e.title || firstLine(e.text);
  const body = e.title ? e.text : String(e.text || '').replace(firstLine(e.text), '');
  return (
    <button type="button" className="diary-item" onClick={() => app.push('diary', { id: e.id })} style={m ? { '--mc': m.c } : undefined}>
      <div className="di-date">
        <b>{d.getDate()}</b>
        <span>{WD[d.getDay()]}</span>
      </div>
      <div className="di-main">
        <div className="di-top">
          <span className="di-title">{title || 'Nomsiz yozuv'}</span>
          {m && <span className="di-mood" title={m.l}>{m.e}</span>}
        </div>
        {String(body || '').trim() && <div className="di-text">{snippet(body, q)}</div>}
        <div className="di-meta">
          {e.time && <span>{e.time}</span>}
          {(e.tags || []).slice(0, 4).map((x) => <span key={x} className="di-tag">#{x}</span>)}
        </div>
      </div>
    </button>
  );
}

function TodayPrompt({ compact }) {
  const app = useApp();
  return (
    <div className={'diary-today' + (compact ? ' compact' : '')}>
      {!compact && (
        <div className="dt-head">
          <b>Bugun qanday o'tdi?</b>
          <span>{fmtLongDate()}</span>
        </div>
      )}
      <div className="mood-row">
        {MOODS.map((m) => (
          <button key={m.v} type="button" onClick={() => app.openSheet('diary', { preset: { mood: m.v } })} aria-label={m.l}>
            <span>{m.e}</span>
            <small>{m.l}</small>
          </button>
        ))}
      </div>
      <button type="button" className="btn primary wide" onClick={() => app.openSheet('diary')}>
        <Icon name="edit" size={18} /> Bugun haqida yozish
      </button>
    </div>
  );
}

function DiaryCalendar({ list, month, setMonth, day, setDay }) {
  const app = useApp();
  const t = today();
  const first = parseDate(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const byDay = {};
  for (const e of list) if (e.date && e.date.startsWith(month)) (byDay[e.date] ||= []).push(e);
  const cells = [];
  for (let n = 0; n < lead; n++) cells.push(null);
  for (let n = 1; n <= dim; n++) cells.push(`${month}-${pad(n)}`);
  const sel = day && day.startsWith(month) ? day : null;
  const selList = sel ? [...(byDay[sel] || [])].sort(diarySort) : [];
  const all = Object.values(byDay).flat();
  const moods = all.map((e) => e.mood).filter(Boolean);
  const avg = moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : 0;
  return (
    <>
      <div className="month-switch">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Oldingi oy"><Icon name="left" /></button>
        <span>{monthLabel(month)}</span>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey(t)} aria-label="Keyingi oy"><Icon name="right" /></button>
      </div>
      <div className="dcal">
        {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((w) => <span key={w} className="dcal-wd">{w}</span>)}
        {cells.map((c, n) => {
          if (!c) return <span key={'e' + n} />;
          const es = byDay[c] || [];
          const last = [...es].sort(diarySort)[0];
          const m = last && moodOf(last.mood);
          return (
            <button
              key={c}
              type="button"
              className={'dcal-d' + (es.length ? ' has' : '') + (c === t ? ' today' : '') + (c === sel ? ' on' : '') + (c > t ? ' future' : '')}
              style={m ? { '--mc': m.c } : undefined}
              onClick={() => setDay(c === sel ? null : c)}
              aria-label={`${fmtDate(c, { withYear: true })}${es.length ? `, ${es.length} ta yozuv` : ''}`}
            >
              <b>{Number(c.slice(8))}</b>
              {es.length > 0 && <i>{m ? m.e : '•'}</i>}
            </button>
          );
        })}
      </div>
      <div className="dcal-stats">
        <span><b>{Object.keys(byDay).length}</b> kun yozilgan</span>
        <span><b>{all.length}</b> ta yozuv</span>
        {avg > 0 && <span>O'rtacha kayfiyat {moodOf(avg).e}</span>}
      </div>
      {sel && (
        <section className="group">
          <h3 className="group-t">{fullDate(sel)}</h3>
          {selList.length ? (
            <div className="diary-list">{selList.map((e) => <DiaryItem key={e.id} e={e} />)}</div>
          ) : (
            <div className="calm pad">Bu kunga yozuv yo'q.</div>
          )}
          {sel <= t && (
            <button className="add-row" onClick={() => app.openSheet('diary', { preset: { date: sel } })}>
              <Icon name="plus" size={18} /> Shu kunga yozish
            </button>
          )}
        </section>
      )}
    </>
  );
}

/** "1 yil oldin bugun" yoki "Bir oy oldin" eslatmasi */
function OnThisDay({ list }) {
  const app = useApp();
  const t = today();
  const md = t.slice(5);
  const y = Number(t.slice(0, 4));
  const monthAgo = addDays(t, -30);
  const hits = list.filter((e) => e.date && ((e.date.slice(5) === md && Number(e.date.slice(0, 4)) < y) || e.date === monthAgo));
  if (!hits.length) return null;
  const e = [...hits].sort(diarySort)[0];
  const yrs = y - Number(e.date.slice(0, 4));
  const when = e.date.slice(5) === md && yrs > 0 ? `${yrs} yil oldin bugun` : 'Bir oy oldin';
  return (
    <button type="button" className="diary-otd" onClick={() => app.push('diary', { id: e.id })}>
      <span className="otd-l"><Icon name="clock" size={15} /> {when}</span>
      <span className="otd-t">{diaryTitle(e)}</span>
    </button>
  );
}

export default function Diary({ sub, setSub }) {
  const db = useData();
  const app = useApp();
  const mode = sub || 'feed';
  const [q0, setQ] = useState('');
  const [mood, setMood] = useState(0);
  const [tag, setTag] = useState('');
  const [limit, setLimit] = useState(40);
  const [month, setMonth] = useState(monthKey(today()));
  const [day, setDay] = useState(today());
  const list = db.diary;
  const q = norm(q0.trim());
  const todayCount = list.filter((e) => e.date === today()).length;
  const streak = diaryStreak(list);
  const tags = useMemo(() => {
    const c = {};
    for (const e of list) for (const t of e.tags || []) c[t] = (c[t] || 0) + 1;
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map((x) => x[0]);
  }, [list]);
  const filtered = useMemo(() => list.filter((e) => (!mood || e.mood === mood) && (!tag || (e.tags || []).includes(tag)) && matches(e, q)), [list, mood, tag, q]);
  const groups = [];
  for (const e of filtered.slice(0, limit)) {
    const k = monthKey(e.date || today());
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.items.push(e);
    else groups.push({ k, items: [e] });
  }
  const filtering = !!(q || mood || tag);

  return (
    <div className="page diary-page">
      <header className="top">
        <div>
          <div className="eyebrow">{list.length} ta yozuv{streak > 1 ? ` · ${streak} kun ketma-ket` : ''}</div>
          <h1>Kundalik</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.openSheet('diary')} aria-label="Yangi yozuv"><Icon name="edit" /></button>
        </div>
      </header>
      <div className="search-in diary-search">
        <Icon name="search" size={18} />
        <input
          value={q0}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(40);
            if (e.target.value && mode !== 'feed') setSub('feed');
          }}
          placeholder="Qidirish: so'z, #teg yoki sana"
          aria-label="Kundalikdan qidirish"
          enterKeyHint="search"
        />
        {q0 && <button className="icon-btn sm" onClick={() => setQ('')} aria-label="Tozalash"><Icon name="x" size={16} /></button>}
      </div>
      <Segmented options={[{ v: 'feed', l: 'Lenta' }, { v: 'calendar', l: 'Kalendar' }]} value={mode} onChange={setSub} />
      {!db.diaryLoaded ? (
        <div className="loading">Yuklanmoqda…</div>
      ) : mode === 'calendar' ? (
        <DiaryCalendar list={list} month={month} setMonth={setMonth} day={day} setDay={setDay} />
      ) : (
        <>
          {!filtering && todayCount === 0 && <TodayPrompt />}
          {!filtering && <OnThisDay list={list} />}
          {list.some((e) => e.mood) && (
            <div className="chips mood-chips">
              {[{ v: 0, l: 'Hammasi' }, ...MOODS].map((m) => (
                <button key={m.v} type="button" className={'chip' + (mood === m.v ? ' on' : '')} onClick={() => setMood(mood === m.v ? 0 : m.v)} aria-label={m.l}>
                  {m.v ? m.e : m.l}
                </button>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="tag-row">
              {tags.map((t) => (
                <button key={t} className={'tag diary-tagbtn' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>
              ))}
            </div>
          )}
          {filtering && (
            <div className="calm diary-count">
              {filtered.length ? `${filtered.length} ta yozuv topildi` : ''}
              <button
                className="link inline"
                onClick={() => {
                  setQ('');
                  setMood(0);
                  setTag('');
                }}
              >
                Filtrni tozalash
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <Empty icon="diary" title="Kundalik hali bo'sh" text="Har kuni bo'lgan voqealarni, o'ylaringiz va his-tuyg'ularingizni yozib boring. Keyin istalgan kunni topib o'qiysiz." />
          ) : filtered.length === 0 ? (
            <Empty icon="search" title="Hech narsa topilmadi" text={q0 ? `«${q0}» kundalikda uchramadi.` : "Bu filtr bo'yicha yozuv yo'q."} />
          ) : (
            groups.map((g) => (
              <section key={g.k} className="group">
                <h3 className="group-t">{monthLabel(g.k)} <span>{g.items.length}</span></h3>
                <div className="diary-list">{g.items.map((e) => <DiaryItem key={e.id} e={e} q={q} />)}</div>
              </section>
            ))
          )}
          {filtered.length > limit && (
            <button className="add-row" onClick={() => setLimit(limit + 60)}>Yana ko'rsatish ({filtered.length - limit})</button>
          )}
        </>
      )}
    </div>
  );
}

export function DiaryView({ id }) {
  const db = useData();
  const app = useApp();
  const [cur, setCur] = useState(id);
  const sorted = db.diary; // allaqachon saralangan (yangi → eski)
  const idx = sorted.findIndex((e) => e.id === cur);
  const e = sorted[idx];
  if (!e) {
    return (
      <div className="page detail">
        <header className="top">
          <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        </header>
        <Empty icon="diary" title="Yozuv topilmadi" />
      </div>
    );
  }
  const m = moodOf(e.mood);
  const newer = sorted[idx - 1];
  const older = sorted[idx + 1];
  const words = String(e.text || '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="page detail diary-view">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.openSheet('diary', { id: e.id, fromView: true })} aria-label="Tahrirlash"><Icon name="edit" /></button>
        </div>
      </header>
      <article className="diary-read">
        <div className="dr-date">
          <Icon name="calendar" size={15} /> {fullDate(e.date)}
          {e.time ? ` · ${e.time}` : ''}
        </div>
        {m && <span className="dr-mood" style={{ '--mc': m.c }}>{m.e} {m.l}</span>}
        {e.title && <h1 className="dr-title">{e.title}</h1>}
        <div className="dr-text">{e.text}</div>
        {(e.tags || []).length > 0 && (
          <div className="idea-tags dr-tags">{e.tags.map((t) => <span key={t}>#{t}</span>)}</div>
        )}
        <div className="dr-foot">
          {words} so'z
          {e.updatedAt && e.createdAt && e.updatedAt - e.createdAt > 60000 ? ` · tahrirlangan ${fmtDate(dateStr(new Date(e.updatedAt)))}` : ''}
        </div>
      </article>
      <div className="dr-nav">
        <button type="button" className="btn soft" disabled={!older} onClick={() => older && setCur(older.id)}>
          <Icon name="left" size={18} /> Oldingi
        </button>
        <button type="button" className="btn soft" disabled={!newer} onClick={() => newer && setCur(newer.id)}>
          Keyingi <Icon name="right" size={18} />
        </button>
      </div>
    </div>
  );
}

const draftGet = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};
const draftSet = (k, v) => {
  try {
    if (v) localStorage.setItem(k, JSON.stringify(v));
    else localStorage.removeItem(k);
  } catch {}
};

export function DiarySheet({ id, preset = {}, fromView }) {
  const db = useData();
  const app = useApp();
  const entry = id && db.diary.find((e) => e.id === id);
  const key = 'kundalik-diary-draft-' + (id || 'new');
  const [base] = useState(() => ({
    date: today(),
    time: nowTime(),
    mood: 0,
    title: '',
    text: '',
    tags: [],
    ...preset,
    ...(entry ? { date: entry.date, time: entry.time || '', mood: entry.mood || 0, title: entry.title || '', text: entry.text || '', tags: entry.tags || [] } : {}),
  }));
  // Yopilib qolgan oynadagi yozilgan matn qoralama sifatida qaytadi
  const [init] = useState(() => {
    const d = draftGet(key);
    return d && (d.text || d.title) && (d.text !== base.text || d.title !== base.title)
      ? { f: { ...base, ...d, ...(preset.mood && !entry ? { mood: preset.mood } : {}) }, restored: true }
      : { f: base, restored: false };
  });
  const [f, setF] = useState(init.f);
  const [restored, setRestored] = useState(init.restored);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.target ? v.target.value : v }));
  const ta = useRef(null);

  useEffect(() => {
    const dirty = (f.text || f.title) && (f.text !== base.text || f.title !== base.title || f.mood !== base.mood);
    const t = setTimeout(() => draftSet(key, dirty ? { date: f.date, time: f.time, mood: f.mood, title: f.title, text: f.text, tags: f.tags } : null), 300);
    return () => clearTimeout(t);
  }, [f]);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(200, el.scrollHeight + 4) + 'px';
  }, [f.text]);

  const can = !!(f.text.trim() || f.title.trim());
  const words = f.text.trim().split(/\s+/).filter(Boolean).length;
  const save = () => {
    if (!can) return;
    const data = { date: f.date || today(), time: f.time || '', mood: f.mood || 0, title: f.title.trim(), text: f.text.replace(/\s+$/, ''), tags: f.tags || [] };
    if (entry) db.updateDiary(id, data);
    else db.addDiary(data);
    draftSet(key, null);
    app.closeSheet();
    app.toast(entry ? 'Yozuv saqlandi' : 'Kundalikka yozildi');
  };
  const remove = () => {
    db.removeDiary(id);
    draftSet(key, null);
    app.closeSheet();
    if (fromView) app.pop();
    app.toast("Yozuv o'chirildi");
  };

  return (
    <Sheet
      title={entry ? 'Yozuvni tahrirlash' : 'Yangi yozuv'}
      onClose={app.closeSheet}
      wide
      footer={
        <>
          <div className="foot-left">{entry && <DeleteButton onDelete={remove} />}</div>
          <button type="button" className="btn primary" onClick={save} disabled={!can}>Saqlash</button>
        </>
      }
    >
      {restored && (
        <div className="draft-note">
          <span>Saqlanmagan qoralama tiklandi.</span>
          <button
            type="button"
            className="link inline"
            onClick={() => {
              setF(base);
              setRestored(false);
              draftSet(key, null);
            }}
          >
            Bekor qilish
          </button>
        </div>
      )}
      <div className="diary-dt">
        <Field label="Sana" htmlFor="d-date">
          <input id="d-date" type="date" value={f.date} max={today()} onChange={set('date')} />
        </Field>
        <Field label="Vaqt" htmlFor="d-time">
          <input id="d-time" type="time" value={f.time} onChange={set('time')} />
        </Field>
      </div>
      <Field label="Kayfiyat">
        <div className="mood-row pick" role="radiogroup" aria-label="Kayfiyat">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              role="radio"
              aria-checked={f.mood === m.v}
              className={f.mood === m.v ? 'on' : ''}
              style={{ '--mc': m.c }}
              onClick={() => setF((x) => ({ ...x, mood: x.mood === m.v ? 0 : m.v }))}
            >
              <span>{m.e}</span>
              <small>{m.l}</small>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Sarlavha" htmlFor="d-title">
        <input id="d-title" value={f.title} onChange={set('title')} placeholder="Ixtiyoriy, masalan: Yangi ishdagi birinchi kun" />
      </Field>
      <Field label="Bugun nima bo'ldi?" htmlFor="d-text" hint={words ? `${words} so'z` : 'Yozganingiz avtomatik qoralama sifatida saqlanib turadi.'}>
        <textarea
          id="d-text"
          ref={ta}
          className="diary-ta"
          rows={9}
          autoFocus={!entry && !init.restored}
          value={f.text}
          onChange={set('text')}
          placeholder="Bugungi voqealar, uchrashuvlar, o'ylar va his-tuyg'ular…"
        />
      </Field>
      <Field label="Teglar" htmlFor="d-tags">
        <TagInput id="d-tags" value={f.tags} onChange={set('tags')} />
      </Field>
    </Sheet>
  );
}

export function HomeDiaryCard() {
  const db = useData();
  const app = useApp();
  const todays = db.diary.filter((e) => e.date === today());
  const streak = diaryStreak(db.diary);
  const e = todays[0];
  const m = e && moodOf(e.mood);
  return (
    <section className="card diary-card" style={{ '--sc': 'var(--c-diary)' }}>
      <div className="card-head">
        <span className="card-ic"><Icon name="diary" size={18} /></span>
        <h2>Kundalik</h2>
        {streak > 0 && <span className="card-meta">{streak} kun ketma-ket</span>}
        <button className="link" onClick={() => app.go('diary')}>Hammasi</button>
      </div>
      {!db.diaryLoaded ? (
        <div className="calm">Yuklanmoqda…</div>
      ) : e ? (
        <>
          <button type="button" className="hd-entry" onClick={() => app.push('diary', { id: e.id })}>
            <span className="hd-top">
              {m && <span>{m.e}</span>}
              <b>{diaryTitle(e)}</b>
              {e.time && <small>{e.time}</small>}
            </span>
            {e.title && e.text && <span className="hd-text">{e.text}</span>}
          </button>
          <button className="link" onClick={() => app.openSheet('diary')}>
            <Icon name="plus" size={16} />
            {todays.length > 1 ? ` Bugun ${todays.length} ta yozuv · yana yozish` : ' Yana yozish'}
          </button>
        </>
      ) : (
        <TodayPrompt compact />
      )}
    </section>
  );
}
