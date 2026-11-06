import { useEffect, useState } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Field, Empty } from '../ui.jsx';
import { norm, fmtDate, money } from '../util.js';
import { getBackend, authErrorText, DEMO } from '../backend.js';
import { askPermission, permissionState, NATIVE } from '../notify.js';
import { DAYS } from '../schedule.jsx';

/* ---------------- Qidiruv ---------------- */
export function Search() {
  const db = useData();
  const app = useApp();
  const [q, setQ] = useState('');
  const s = norm(q.trim());
  const has = (...xs) => xs.some((x) => norm(Array.isArray(x) ? x.join(' ') : x).includes(s));
  const groups = s.length < 2 ? [] : [
    { l: 'Vazifalar', icon: 'tasks', items: db.tasks.filter((t) => has(t.title, t.note)).map((t) => ({ id: t.id, t: t.title, sub: t.status === 'done' ? 'Bajarilgan' : t.due ? fmtDate(t.due) : '', go: () => app.openSheet('task', { id: t.id }) })) },
    { l: 'Darslar', icon: 'calendar', items: db.lessons.filter((x) => has(x.subject, x.group, x.room, x.note)).map((x) => ({ id: x.id, t: `${x.subject} · ${x.group}`, sub: `${DAYS[x.day - 1].l}, ${x.start}–${x.end}${x.room ? ' · ' + x.room : ''}`, go: () => app.openSheet('lesson', { id: x.id }) })) },
    { l: 'Rejalar', icon: 'target', items: db.plans.filter((p) => has(p.title, p.goal, p.note, (p.steps || []).map((x) => x.text))).map((p) => ({ id: p.id, t: p.title, sub: p.goal, go: () => app.push('plan', { id: p.id }) })) },
    { l: "G'oyalar", icon: 'bulb', items: db.ideas.filter((i) => has(i.title, i.text, i.tags || [])).map((i) => ({ id: i.id, t: i.title, sub: i.text, go: () => app.openSheet('idea', { id: i.id }) })) },
    { l: 'Kitoblar', icon: 'book', items: db.books.filter((b) => has(b.title, b.author, b.summary)).map((b) => ({ id: b.id, t: b.title, sub: b.author, go: () => app.push('book', { id: b.id }) })) },
    { l: 'Iqtiboslar', icon: 'quote', items: db.quotes.filter((x) => has(x.text, x.note)).map((x) => ({ id: x.id, t: x.text, sub: db.books.find((b) => b.id === x.bookId)?.title, go: () => app.openSheet('quote', { id: x.id }) })) },
    { l: 'Moliya', icon: 'wallet', items: db.tx.filter((x) => (x.type === 'income' || x.type === 'expense') && has(x.note, x.cat)).slice(0, 30).map((x) => ({ id: x.id, t: `${x.type === 'income' ? '+' : '−'}${money(x.amount)} so'm · ${x.cat}`, sub: `${fmtDate(x.date)}${x.note ? ' · ' + x.note : ''}`, go: () => app.openSheet('tx', { id: x.id }) })) },
    { l: 'Qarzlar', icon: 'coins', items: db.debts.filter((x) => has(x.person, x.note)).map((x) => ({ id: x.id, t: `${x.person} · ${money(x.amount)} so'm`, sub: x.dir === 'lent' ? 'Men berdim' : 'Men oldim', go: () => app.openSheet('debt', { id: x.id }) })) },
    { l: 'Bozorlik', icon: 'cart', items: db.shop.filter((x) => has(x.name)).map((x) => ({ id: x.id, t: x.name, sub: x.bought ? 'Olingan' : x.qty, go: () => app.openSheet('shop', { id: x.id }) })) },
  ].filter((g) => g.items.length);
  return (
    <div className="page detail">
      <header className="top search-top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <div className="search-in grow">
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hamma bo'limlardan qidirish" aria-label="Qidirish" />
          {q && <button className="icon-btn sm" onClick={() => setQ('')} aria-label="Tozalash"><Icon name="x" size={16} /></button>}
        </div>
      </header>
      {s.length < 2 ? (
        <div className="calm pad">Vazifa, reja, g'oya, kitob, iqtibos, xarajat va qarzlar ichidan qidiradi.</div>
      ) : groups.length === 0 ? (
        <Empty icon="search" title="Hech narsa topilmadi" text={`«${q}» so'zi hech qayerda uchramadi.`} />
      ) : (
        groups.map((g) => (
          <section key={g.l} className="group">
            <h3 className="group-t"><Icon name={g.icon} size={15} /> {g.l} <span>{g.items.length}</span></h3>
            <ul className="list">
              {g.items.map((it) => (
                <li key={it.id} className="res-row" onClick={it.go}>
                  <div className="tr-main">
                    <div className="tr-title clamp">{it.t}</div>
                    {it.sub && <div className="tr-sub clamp">{it.sub}</div>}
                  </div>
                  <Icon name="right" size={18} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/* ---------------- Sozlamalar ---------------- */
function CatEditor({ title, list, onChange }) {
  const [t, setT] = useState('');
  const add = () => {
    const v = t.trim();
    if (v && !list.includes(v)) onChange([...list, v]);
    setT('');
  };
  return (
    <section className="card">
      <div className="card-head"><h2>{title}</h2></div>
      <div className="cat-list">
        {list.map((c) => (
          <span key={c} className="cat-tag">
            {c}
            {list.length > 1 && <button onClick={() => onChange(list.filter((x) => x !== c))} aria-label={`${c} kategoriyasini olib tashlash`}><Icon name="x" size={13} stroke={2.4} /></button>}
          </span>
        ))}
      </div>
      <div className="inline-add">
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Yangi kategoriya" onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Yangi kategoriya" />
        <button className="btn soft" onClick={add} disabled={!t.trim()}>Qo'shish</button>
      </div>
    </section>
  );
}

export function Settings() {
  const db = useData();
  const app = useApp();
  const [perm, setPerm] = useState('web');
  useEffect(() => { permissionState().then(setPerm); }, []);
  const r = db.settings.reading;
  const lr = db.settings.lessonRemind;
  const setLesson = async (patch) => {
    const next = { ...lr, ...patch };
    if (next.on && NATIVE) {
      const p = await askPermission();
      setPerm(p);
    }
    db.saveSettings({ lessonRemind: next });
  };
  const setReading = async (patch) => {
    const next = { ...r, ...patch };
    if (next.on && NATIVE) {
      const p = await askPermission();
      setPerm(p);
      if (p !== 'granted') {
        app.toast('Bildirishnomalarga ruxsat berilmagan', 'warn');
        return;
      }
    }
    db.saveSettings({ reading: next });
  };
  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <h1 className="h-inline">Sozlamalar</h1>
        <span />
      </header>

      <section className="card">
        <div className="card-head"><h2>Hisob</h2></div>
        <div className="acct">
          <div>
            <div className="acct-mail">{DEMO ? 'Namuna rejimi' : db.user.email}</div>
            <div className="muted small">{DEMO ? "Ma'lumotlar faqat shu qurilmada" : "Ma'lumotlar barcha qurilmalarda sinxronlanadi"}</div>
          </div>
          <button className="btn ghost" onClick={() => db.backend.signOut()}>
            <Icon name="logout" size={18} /> {DEMO ? 'Namunani tozalash' : 'Chiqish'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Eslatmalar</h2></div>
        {!NATIVE && <p className="muted small">Eslatmalar telefondagi ilovada keladi. Kompyuter versiyasida faqat ro'yxatlar ko'rinadi.</p>}
        {NATIVE && perm !== 'granted' && (
          <div className="alert warn">
            <span>Bildirishnomalarga ruxsat berilmagan</span>
            <button className="link" onClick={async () => setPerm(await askPermission())}>Ruxsat berish</button>
          </div>
        )}
        <label className="switch-row">
          <span>
            <b>Dars eslatmasi</b>
            <span className="muted small">Har bir darsdan oldin, dars jadvali bo'yicha</span>
          </span>
          <input type="checkbox" className="switch" checked={!!lr.on} onChange={(e) => setLesson({ on: e.target.checked })} />
        </label>
        {lr.on && (
          <Field label="Necha daqiqa oldin">
            <div className="chips">
              {[5, 10, 15, 30, 60].map((m) => (
                <button key={m} type="button" className={'chip' + (lr.min === m ? ' on' : '')} onClick={() => setLesson({ min: m })}>{m === 60 ? '1 soat' : `${m} daq`}</button>
              ))}
            </div>
          </Field>
        )}
        <label className="switch-row">
          <span>
            <b>Kitob o'qish eslatmasi</b>
            <span className="muted small">Har kuni belgilangan vaqtda</span>
          </span>
          <input type="checkbox" className="switch" checked={!!r.on} onChange={(e) => setReading({ on: e.target.checked })} />
        </label>
        {r.on && (
          <Field label="Vaqti" htmlFor="rd-time">
            <input id="rd-time" type="time" value={r.time} onChange={(e) => setReading({ time: e.target.value })} />
          </Field>
        )}
        <p className="muted small">Vazifa eslatmasini har bir vazifaning o'zida tanlaysiz. Reja muddatidan bir kun oldin va muddat kuni ertalab soat 9:00 da eslatma keladi.</p>
      </section>

      <CatEditor title="Chiqim kategoriyalari" list={db.settings.expenseCats} onChange={(v) => db.saveSettings({ expenseCats: v })} />
      <CatEditor title="Kirim kategoriyalari" list={db.settings.incomeCats} onChange={(v) => db.saveSettings({ incomeCats: v })} />
      <button className="btn soft wide" onClick={() => app.openSheet('limits')}><Icon name="wallet" size={18} /> Oylik limitlar</button>
      <p className="muted small center">Kundalik · 1.0</p>
    </div>
  );
}

/* ---------------- Kirish ---------------- */
export function Login() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const b = await getBackend();
      if (mode === 'in') await b.signIn(email.trim(), pw);
      else await b.signUp(email.trim(), pw);
    } catch (x) {
      setErr(authErrorText(x));
    }
    setBusy(false);
  };
  const reset = async () => {
    setErr('');
    if (!email.trim()) return setErr('Avval email manzilingizni yozing.');
    try {
      await (await getBackend()).reset(email.trim());
      setInfo("Parolni tiklash havolasi emailingizga yuborildi. Pochtani tekshiring (Spam papkasini ham).");
    } catch (x) {
      setErr(authErrorText(x));
    }
  };
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="logo"><i /><i /><i /><i /></div>
        <h1>Kundalik</h1>
        <p className="muted">Vazifalar, rejalar, g'oyalar, pul va kitoblar bir joyda.</p>
        <div className="seg">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Kirish</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Hisob ochish</button>
        </div>
        <Field label="Email" htmlFor="l-email">
          <input id="l-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ism@gmail.com" required />
        </Field>
        <Field label="Parol" htmlFor="l-pw" hint={mode === 'up' ? 'Kamida 6 ta belgi. Uni eslab qoling: boshqa qurilmada ham shu parol bilan kirasiz.' : null}>
          <input id="l-pw" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
        </Field>
        {err && <div className="alert over">{err}</div>}
        {info && <div className="alert ok">{info}</div>}
        <button className="btn primary wide" disabled={busy}>{busy ? 'Kutib turing…' : mode === 'in' ? 'Kirish' : 'Hisob ochish'}</button>
        {mode === 'in' && <button type="button" className="link center" onClick={reset}>Parolni unutdim</button>}
      </form>
    </div>
  );
}
