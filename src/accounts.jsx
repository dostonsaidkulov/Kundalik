import { useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Sheet, Field, Segmented, DeleteButton, MoneyInput, Icon, Empty } from './ui.jsx';
import { today, money, fmtDate, catColor, NATURE, natureOf } from './util.js';

export const ACC_TYPES = {
  cash: { l: 'Naqd pul', icon: 'cash', c: 'var(--c-money)' },
  card: { l: 'Plastik karta', icon: 'card', c: 'var(--c-tasks)' },
  bank: { l: 'Bank hisobi', icon: 'bank', c: 'var(--c-thoughts)' },
  invest: { l: 'Investitsiya', icon: 'trend', c: 'var(--c-books)' },
};
export const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: 'Naqd pul', type: 'cash', initial: 0, order: 0 },
  { id: 'card', name: 'Plastik karta', type: 'card', initial: 0, order: 1 },
  { id: 'invest', name: 'Investitsiya', type: 'invest', initial: 0, order: 2 },
];

// Hisobi ko'rsatilmagan eski yozuvlar naqd pulga tegishli deb olinadi
export const accOf = (t) => t.acc || 'cash';

/** Har bir hisob bo'yicha qoldiq: boshlang'ich + kirim − chiqim ± o'tkazma + to'g'rilash */
export function balances(accounts, tx, until) {
  const b = Object.fromEntries(accounts.map((a) => [a.id, a.initial || 0]));
  const add = (id, v) => {
    if (id in b) b[id] += v;
    else b[id] = v;
  };
  for (const t of tx) {
    if (until && t.date > until) continue;
    const v = t.amount || 0;
    if (t.type === 'income') add(accOf(t), v);
    else if (t.type === 'expense') add(accOf(t), -v);
    else if (t.type === 'transfer') {
      add(t.from, -v);
      add(t.to, v);
    } else if (t.type === 'adjust') add(accOf(t), v);
  }
  return b;
}
export function totalBalance(accounts, tx, until) {
  const b = balances(accounts, tx, until);
  return accounts.reduce((s, a) => s + (b[a.id] || 0), 0);
}

const LAST = 'kundalik-last-acc';
export function lastAcc(accounts) {
  let id = null;
  try {
    id = localStorage.getItem(LAST);
  } catch {}
  const live = accounts.filter((a) => !a.archived);
  return (live.find((a) => a.id === id) || live.find((a) => a.type === 'card') || live[0])?.id || 'cash';
}
export function rememberAcc(id) {
  try {
    localStorage.setItem(LAST, id);
  } catch {}
}

export function AccIcon({ acc, size = 18 }) {
  const t = ACC_TYPES[acc?.type] || ACC_TYPES.cash;
  return (
    <span className="acc-ic" style={{ '--ac': t.c }} aria-hidden="true">
      <Icon name={t.icon} size={size} />
    </span>
  );
}

export function AccPicker({ value, onChange, exclude, label }) {
  const db = useData();
  const bal = balances(db.accounts, db.tx);
  const list = db.accounts.filter((a) => !a.archived && a.id !== exclude);
  return (
    <div className="acc-pick" role="radiogroup" aria-label={label}>
      {list.map((a) => (
        <button key={a.id} type="button" role="radio" aria-checked={value === a.id} className={'acc-opt' + (value === a.id ? ' on' : '')} onClick={() => onChange(a.id)}>
          <AccIcon acc={a} size={16} />
          <span className="ao-name">{a.name}</span>
          <span className="ao-bal">{money(bal[a.id] || 0)}</span>
        </button>
      ))}
    </div>
  );
}

/** Kirim/chiqim/o'tkazma qatori — umumiy ro'yxat va hisob sahifasida */
export function TxRow({ t, accountView }) {
  const db = useData();
  const app = useApp();
  const accName = (id) => db.accounts.find((a) => a.id === id)?.name || 'O\'chirilgan hisob';
  if (t.type === 'transfer') {
    const sign = accountView ? (t.to === accountView ? '+' : '−') : '';
    return (
      <li className="tx-row" onClick={() => app.openSheet('tx', { id: t.id })}>
        <span className="tx-ic neutral"><Icon name="swap" size={16} /></span>
        <div className="tr-main">
          <div className="tr-title">O'tkazma</div>
          <div className="tr-sub">{accName(t.from)} → {accName(t.to)}{t.note ? ` · ${t.note}` : ''}</div>
        </div>
        <span className={'tx-amt neutral' + (sign === '+' ? ' in' : '')}>{sign}{money(t.amount)}</span>
      </li>
    );
  }
  if (t.type === 'adjust') {
    return (
      <li className="tx-row" onClick={() => app.openSheet('adjust', { id: t.id })}>
        <span className="tx-ic neutral"><Icon name="edit" size={16} /></span>
        <div className="tr-main">
          <div className="tr-title">{db.accounts.find((a) => a.id === accOf(t))?.type === 'invest' ? 'Qiymat yangilandi' : "Qoldiq to'g'rilandi"}</div>
          <div className="tr-sub">{accName(accOf(t))}{t.note ? ` · ${t.note}` : ''}</div>
        </div>
        <span className={'tx-amt neutral' + (t.amount >= 0 ? ' in' : '')}>{t.amount >= 0 ? '+' : '−'}{money(Math.abs(t.amount))}</span>
      </li>
    );
  }
  const cats = t.type === 'income' ? db.settings.incomeCats : db.settings.expenseCats;
  return (
    <li className="tx-row" onClick={() => app.openSheet('tx', { id: t.id })}>
      <span className="tx-ic" style={{ '--cc': catColor(t.cat, cats) }}>
        <Icon name={t.type === 'income' ? 'up' : 'down'} size={16} />
      </span>
      <div className="tr-main">
        <div className="tr-title">{t.cat}</div>
        <div className="tr-sub">
          {t.type === 'expense' && (() => { const n = natureOf(t, db.settings); return <span className="nat-tag" style={{ '--nc': NATURE[n].c }}>{NATURE[n].l}</span>; })()}
          {[accountView ? '' : accName(accOf(t)), t.note].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className={'tx-amt ' + (t.type === 'income' ? 'in' : 'out')}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</span>
    </li>
  );
}

export function AccountsBlock() {
  const db = useData();
  const app = useApp();
  const bal = balances(db.accounts, db.tx);
  const live = db.accounts.filter((a) => !a.archived);
  const main = live.filter((a) => a.type !== 'invest');
  const inv = live.filter((a) => a.type === 'invest');
  const total = main.reduce((s, a) => s + (bal[a.id] || 0), 0);
  const invest = inv.reduce((s, a) => s + (bal[a.id] || 0), 0);
  const Card = ({ a }) => (
    <button className="acc-card" onClick={() => app.push('account', { id: a.id })}>
      <AccIcon acc={a} />
      <span className="ac-name">{a.name}</span>
      <b className={(bal[a.id] || 0) < 0 ? 'neg' : ''}>{money(bal[a.id] || 0)}</b>
    </button>
  );
  return (
    <section className="accounts">
      <div className="acc-total">
        <span>Jami mablag'</span>
        <b className={total < 0 ? 'neg' : ''}>{money(total)} <small>so'm</small></b>
        <span className="muted small">Investitsiyalarsiz, ishlatish mumkin bo'lgan pul</span>
      </div>
      <div className="acc-grid">
        {main.map((a) => (<Card key={a.id} a={a} />))}
        <button className="acc-card add" onClick={() => app.openSheet('account')}>
          <Icon name="plus" size={20} />
          <span className="ac-name">Hisob qo'shish</span>
        </button>
      </div>
      <button className="btn soft wide transfer-btn" onClick={() => app.openSheet('tx', { preset: { type: 'transfer' } })}>
        <Icon name="swap" size={18} /> Hisobdan hisobga o'tkazish
      </button>
      {inv.length > 0 && (
        <div className="invest-block">
          <div className="ib-head">
            <span><Icon name="trend" size={16} /> Investitsiyalar</span>
            <b>{money(invest)} <small>so'm</small></b>
          </div>
          <div className="acc-grid">
            {inv.map((a) => <Card key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </section>
  );
}

export function AccountSheet({ id }) {
  const db = useData();
  const app = useApp();
  const old = id && db.accounts.find((a) => a.id === id);
  const [f, setF] = useState({ name: '', type: 'card', initial: 0, ...(old || {}) });
  const used = old && db.tx.some((t) => accOf(t) === id || t.from === id || t.to === id);
  const save = () => {
    if (!f.name.trim()) return;
    const d = { name: f.name.trim(), type: f.type, initial: f.initial || 0 };
    if (old) db.update('accounts', id, d);
    else db.add('accounts', { ...d, order: db.accounts.length });
    app.closeSheet();
    app.toast(old ? 'Hisob saqlandi' : "Hisob qo'shildi");
  };
  const remove = () => {
    if (used) db.update('accounts', id, { archived: true });
    else db.remove('accounts', id);
    app.closeSheet();
    app.pop();
    app.toast(used ? 'Hisob yashirildi, tarixi saqlanib qoldi' : "Hisob o'chirildi");
  };
  return (
    <Sheet title={old ? 'Hisobni tahrirlash' : 'Yangi hisob'} onClose={app.closeSheet}
      footer={<>
        <div className="foot-left">{old && <DeleteButton onDelete={remove} label={used ? 'Yashirish' : "O'chirish"} />}</div>
        <button type="button" className="btn primary" onClick={save} disabled={!f.name.trim()}>Saqlash</button>
      </>}>
      <Field label="Turi">
        <div className="chips">
          {Object.entries(ACC_TYPES).map(([v, t]) => (
            <button key={v} type="button" className={'chip' + (f.type === v ? ' on' : '')} onClick={() => setF((s) => ({ ...s, type: v, name: !s.name || Object.values(ACC_TYPES).some((x) => x.l === s.name) ? t.l : s.name }))}>
              {t.l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Nomi" htmlFor="a-name">
        <input id="a-name" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Masalan: Humo karta, Uzcard, Dollar jamg'arma" />
      </Field>
      <Field label="Boshlang'ich qoldiq" htmlFor="a-init" hint={old ? "Ilovaga yozishni boshlagan paytdagi qoldiq. Hozirgi qoldiqni tuzatish uchun hisob sahifasidagi «Qoldiqni to'g'rilash» dan foydalaning." : 'Hozir bu hisobda qancha pul bor?'}>
        <MoneyInput id="a-init" value={f.initial} onChange={(v) => setF((s) => ({ ...s, initial: v }))} />
      </Field>
    </Sheet>
  );
}

export function AdjustSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.tx.find((t) => t.id === id);
  const accId = old ? accOf(old) : preset.acc;
  const acc = db.accounts.find((a) => a.id === accId);
  const others = db.tx.filter((t) => t.id !== id);
  const current = balances(db.accounts, others)[accId] || 0;
  const [actual, setActual] = useState(old ? current + old.amount : current);
  const [note, setNote] = useState(old?.note || '');
  const invest = acc?.type === 'invest';
  const delta = actual - current;
  const save = () => {
    const d = { type: 'adjust', acc: accId, amount: delta, date: old?.date || today(), note };
    if (old) db.update('tx', id, d);
    else if (delta !== 0) db.add('tx', d);
    app.closeSheet();
    app.toast(delta === 0 ? "O'zgarish yo'q" : invest ? 'Qiymat yangilandi' : "Qoldiq to'g'rilandi");
  };
  return (
    <Sheet title={invest ? 'Joriy qiymatni yangilash' : "Qoldiqni to'g'rilash"} onClose={app.closeSheet}
      footer={<>
        <div className="foot-left">{old && <DeleteButton onDelete={() => { db.remove('tx', id); app.closeSheet(); }} />}</div>
        <button type="button" className="btn primary" onClick={save}>Saqlash</button>
      </>}>
      <p className="muted small">
        {invest
          ? "Investitsiyangiz hozir qancha turishini kiriting. Farq foyda yoki zarar sifatida yoziladi, lekin kirim-chiqimga qo'shilmaydi."
          : "Kartangiz yoki hamyoningizda aslida qancha pul borligini kiriting. Farq to'g'rilash sifatida yoziladi, xarajatlarga qo'shilmaydi."}
      </p>
      <div className="adj-now"><span>{acc?.name}: ilovadagi qoldiq</span><b>{money(current)}</b></div>
      <Field label={invest ? 'Joriy qiymati' : 'Haqiqiy qoldiq'} htmlFor="adj-actual">
        <MoneyInput id="adj-actual" value={actual} onChange={setActual} autoFocus />
      </Field>
      {delta !== 0 && <div className={'adj-delta ' + (delta > 0 ? 'up' : 'down')}>{delta > 0 ? '+' : '−'}{money(Math.abs(delta))} so'm {invest ? (delta > 0 ? 'foyda' : 'zarar') : 'farq'}</div>}
      <Field label="Izoh" htmlFor="adj-note">
        <input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={invest ? 'Masalan: aksiyalar narxi oshdi' : ''} />
      </Field>
    </Sheet>
  );
}

export function AccountDetail({ id }) {
  const db = useData();
  const app = useApp();
  const a = db.accounts.find((x) => x.id === id);
  if (!a) return <div className="page"><Empty icon="wallet" title="Hisob topilmadi" /></div>;
  const bal = balances(db.accounts, db.tx)[id] || 0;
  const list = db.tx.filter((t) => (t.type === 'transfer' ? t.from === id || t.to === id : accOf(t) === id)).slice(0, 300);
  const days = [];
  for (const t of list) {
    const last = days[days.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }
  const invest = a.type === 'invest';
  const inflow = db.tx.filter((t) => t.type === 'transfer' && t.to === id).reduce((s, t) => s + t.amount, 0);
  const outflow = db.tx.filter((t) => t.type === 'transfer' && t.from === id).reduce((s, t) => s + t.amount, 0);
  const gain = db.tx.filter((t) => t.type === 'adjust' && accOf(t) === id).reduce((s, t) => s + t.amount, 0);
  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.openSheet('account', { id })} aria-label="Tahrirlash"><Icon name="edit" /></button>
        </div>
      </header>
      <div className="acc-hero">
        <AccIcon acc={a} size={22} />
        <div className="eyebrow">{ACC_TYPES[a.type]?.l}</div>
        <h1>{a.name}</h1>
        <div className={'acc-bal' + (bal < 0 ? ' neg' : '')}>{money(bal)} <small>so'm</small></div>
        {invest && (
          <div className="inv-facts">
            <div><span>Kiritilgan</span><b>{money(inflow - outflow + (a.initial || 0))}</b></div>
            <div><span>Foyda / zarar</span><b className={gain >= 0 ? 'pos' : 'neg'}>{gain >= 0 ? '+' : '−'}{money(Math.abs(gain))}</b></div>
          </div>
        )}
      </div>
      <div className="acc-actions">
        <button onClick={() => app.openSheet('tx', { preset: { type: 'income', acc: id } })}><Icon name="up" size={18} /><span>Kirim</span></button>
        <button onClick={() => app.openSheet('tx', { preset: { type: 'expense', acc: id } })}><Icon name="down" size={18} /><span>Chiqim</span></button>
        <button onClick={() => app.openSheet('tx', { preset: { type: 'transfer', from: id } })}><Icon name="swap" size={18} /><span>O'tkazma</span></button>
        <button onClick={() => app.openSheet('adjust', { preset: { acc: id } })}><Icon name="edit" size={18} /><span>{invest ? 'Qiymat' : "To'g'rilash"}</span></button>
      </div>
      {days.length === 0 ? (
        <Empty icon="wallet" title="Bu hisobda hali yozuv yo'q" />
      ) : (
        days.map((d) => (
          <section key={d.date} className="group">
            <h3 className="group-t">{fmtDate(d.date)}</h3>
            <ul className="list">{d.items.map((t) => <TxRow key={t.id} t={t} accountView={id} />)}</ul>
          </section>
        ))
      )}
    </div>
  );
}

/** Yillik pul oqimi: har oy kirim, chiqim, sof oqim, investitsiyaga o'tkazilgan, oy oxiridagi qoldiq */
export function yearCashflow(accounts, tx, year) {
  const live = accounts;
  const invIds = new Set(live.filter((a) => a.type === 'invest').map((a) => a.id));
  const main = live.filter((a) => a.type !== 'invest');
  const start = totalBalance(main, tx, `${year - 1}-12-31`);
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    let income = 0;
    let expense = 0;
    let invest = 0;
    let adjust = 0;
    for (const t of tx) {
      if (!t.date || t.date.slice(0, 7) !== key) continue;
      const v = t.amount || 0;
      if (t.type === 'income') income += v;
      else if (t.type === 'expense') expense += v;
      else if (t.type === 'adjust') adjust += v;
      else if (t.type === 'transfer') {
        if (invIds.has(t.to) && !invIds.has(t.from)) invest += v;
        if (invIds.has(t.from) && !invIds.has(t.to)) invest -= v;
      }
    }
    const end = totalBalance(main, tx, `${key}-31`);
    rows.push({ key, m, income, expense, net: income - expense, invest, adjust, end });
  }
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  return { start, rows, income: sum('income'), expense: sum('expense'), net: sum('net'), invest: sum('invest'), adjust: sum('adjust'), end: rows[11].end };
}
