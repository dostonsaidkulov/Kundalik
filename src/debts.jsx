import { useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Sheet, Field, Segmented, DeleteButton, MoneyInput, Icon, Empty, Progress } from './ui.jsx';
import { today, money, fmtDate, hashStr, CAT_COLORS } from './util.js';
import { LineChart, short } from './chart.jsx';

// Qarz: dir = 'lent' (men berdim, menga qaytarishadi) | 'borrowed' (men oldim, men qaytaraman)
export const DEBT_DIR = {
  lent: { l: 'Men berdim', group: 'Menga qarzdorlar', short: 'Menga qaytarishadi' },
  borrowed: { l: 'Men oldim', group: 'Mening qarzlarim', short: 'Men qaytaraman' },
};

export function paid(d) {
  return (d.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
}
export function remaining(d) {
  return Math.max(0, (d.amount || 0) - paid(d));
}
export function isClosed(d) {
  return !!d.closed || remaining(d) <= 0;
}
export function debtTotals(debts) {
  let lent = 0;
  let borrowed = 0;
  for (const d of debts) {
    if (isClosed(d)) continue;
    if (d.dir === 'lent') lent += remaining(d);
    else borrowed += remaining(d);
  }
  return { lent, borrowed };
}

function Avatar({ name }) {
  const c = CAT_COLORS[hashStr(name || '?') % CAT_COLORS.length];
  return (
    <span className="avatar" style={{ '--cc': c }} aria-hidden="true">
      {(name || '?').trim()[0]?.toUpperCase()}
    </span>
  );
}

const pid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function DebtSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.debts.find((d) => d.id === id);
  const [f, setF] = useState({ dir: 'lent', person: '', amount: 0, date: today(), due: '', note: '', remind: true, ...preset, ...(old || {}) });
  const [pay, setPay] = useState(0);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  const people = [...new Set(db.debts.map((d) => d.person).filter(Boolean))];

  const save = () => {
    if (!f.person.trim() || !f.amount) return;
    const data = { dir: f.dir, person: f.person.trim(), amount: f.amount, date: f.date || today(), due: f.due || '', note: f.note || '', remind: !!f.remind };
    if (old) db.update('debts', id, data);
    else db.add('debts', { ...data, payments: [], closed: false });
    app.closeSheet();
    app.toast(old ? 'Saqlandi' : 'Qarz yozib qo\'yildi');
  };

  const payments = old?.payments || [];
  const rest = old ? remaining(old) : 0;
  const addPayment = (amount) => {
    if (!amount || !old) return;
    const next = [...payments, { id: pid(), amount: Math.min(amount, rest), date: today() }];
    const left = (old.amount || 0) - next.reduce((a, p) => a + p.amount, 0);
    db.update('debts', id, { payments: next, closed: left <= 0 });
    setPay(0);
    app.toast(left <= 0 ? 'Qarz to\'liq yopildi' : `${money(amount)} so'm qaytarildi, ${money(left)} qoldi`);
    if (left <= 0) app.closeSheet();
  };
  const removePayment = (p) => {
    const next = payments.filter((x) => x.id !== p.id);
    db.update('debts', id, { payments: next, closed: false });
  };

  return (
    <Sheet title={old ? old.person : 'Yangi qarz'} onClose={app.closeSheet}
      footer={<>
        <div className="foot-left">{old && <DeleteButton onDelete={() => { db.remove('debts', id); app.closeSheet(); app.toast("Qarz o'chirildi"); }} />}</div>
        <button type="button" className="btn primary" onClick={save} disabled={!f.person.trim() || !f.amount}>Saqlash</button>
      </>}>
      <Segmented options={[{ v: 'lent', l: 'Men berdim' }, { v: 'borrowed', l: 'Men oldim' }]} value={f.dir} onChange={set('dir')} />

      {old && (
        <div className="debt-state">
          <div className="ds-row">
            <span>{isClosed(old) ? 'Yopilgan' : 'Qoldiq'}</span>
            <b className={f.dir === 'lent' ? 'in' : ''}>{money(rest)} <small>so'm</small></b>
          </div>
          <Progress value={old.amount ? paid(old) / old.amount : 0} color="var(--c-money)" />
          <div className="ds-meta">{money(paid(old))} / {money(old.amount)} so'm qaytarilgan</div>
          {payments.length > 0 && (
            <ul className="pay-list">
              {payments.map((p) => (
                <li key={p.id}>
                  <span>{fmtDate(p.date)}</span>
                  <b>{money(p.amount)}</b>
                  <button className="icon-btn sm" onClick={() => removePayment(p)} aria-label="To'lovni o'chirish"><Icon name="x" size={15} /></button>
                </li>
              ))}
            </ul>
          )}
          {!isClosed(old) && (
            <>
              <div className="inline-add">
                <MoneyInput id="d-pay" value={pay} onChange={setPay} />
                <button className="btn soft" onClick={() => addPayment(pay)} disabled={!pay}>Qisman</button>
              </div>
              <button className="btn primary wide" onClick={() => addPayment(rest)}>
                <Icon name="check" size={18} /> To'liq qaytarildi
              </button>
            </>
          )}
        </div>
      )}

      <Field label={f.dir === 'lent' ? 'Kimga berdim' : 'Kimdan oldim'} htmlFor="d-person">
        <input id="d-person" list="d-people" value={f.person} onChange={set('person')} placeholder="Ismi" />
        <datalist id="d-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <Field label="Summa" htmlFor="d-amount">
        <MoneyInput id="d-amount" value={f.amount} onChange={set('amount')} autoFocus={!old} />
      </Field>
      <div className="grid2">
        <Field label="Sana" htmlFor="d-date">
          <input id="d-date" type="date" value={f.date} onChange={set('date')} />
        </Field>
        <Field label="Qaytarish muddati" htmlFor="d-due">
          <input id="d-due" type="date" value={f.due} onChange={set('due')} />
        </Field>
      </div>
      {f.due && (
        <label className="switch-row">
          <span>
            <b>Eslatma</b>
            <span className="muted small">Muddatdan bir kun oldin va muddat kuni soat 9:00 da</span>
          </span>
          <input type="checkbox" className="switch" checked={!!f.remind} onChange={(e) => set('remind')(e.target.checked)} />
        </label>
      )}
      <Field label="Izoh" htmlFor="d-note">
        <input id="d-note" value={f.note} onChange={set('note')} placeholder="Nima uchun" />
      </Field>
    </Sheet>
  );
}

export function Debts() {
  const db = useData();
  const app = useApp();
  const [view, setView] = useState('open');
  const t = today();
  const tot = debtTotals(db.debts);
  const open = db.debts.filter((d) => !isClosed(d));
  const closed = db.debts.filter((d) => isClosed(d));
  const list = view === 'open' ? open : closed;

  const Row = ({ d }) => {
    const rest = remaining(d);
    const late = !isClosed(d) && d.due && d.due < t;
    return (
      <li className="debt-row" onClick={() => app.openSheet('debt', { id: d.id })}>
        <Avatar name={d.person} />
        <div className="tr-main">
          <div className="tr-title">{d.person}</div>
          <div className="tr-meta">
            {d.due && !isClosed(d) && <span className={late ? 'danger-text' : ''}><Icon name="calendar" size={13} /> {late ? 'Muddati o\'tgan: ' : ''}{fmtDate(d.due)}</span>}
            {isClosed(d) && <span><Icon name="check" size={13} /> Yopilgan</span>}
            {d.note && <span className="tr-note">{d.note}</span>}
          </div>
          {paid(d) > 0 && !isClosed(d) && <Progress thin value={paid(d) / d.amount} color="var(--c-money)" />}
        </div>
        <div className="debt-amt">
          <b className={d.dir === 'lent' ? 'in' : ''}>{money(isClosed(d) ? d.amount : rest)}</b>
          {paid(d) > 0 && !isClosed(d) && <span>{money(d.amount)} dan</span>}
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="summary debt-sum">
        <div className="sum-io">
          <button onClick={() => app.openSheet('debt', { preset: { dir: 'lent' } })}>
            <span className="io-l in"><Icon name="down" size={14} /> Menga qaytarishadi</span>
            <b className="in">{money(tot.lent)}</b>
          </button>
          <button onClick={() => app.openSheet('debt', { preset: { dir: 'borrowed' } })}>
            <span className="io-l out"><Icon name="up" size={14} /> Men qaytaraman</span>
            <b>{money(tot.borrowed)}</b>
          </button>
        </div>
      </div>
      <DebtDynamics title={`${new Date().getFullYear()}-yil dinamikasi`} />
      <Segmented small options={[{ v: 'open', l: 'Ochiq', n: open.length }, { v: 'closed', l: 'Yopilgan', n: closed.length }]} value={view} onChange={setView} />
      <div style={{ height: 14 }} />
      {list.length === 0 ? (
        <Empty icon="wallet" title={view === 'open' ? "Ochiq qarz yo'q" : "Yopilgan qarz yo'q"} text={view === 'open' ? "Kimga qarz berganingiz yoki kimdan olganingizni yozib qo'ying. Qisman qaytarilganini ham belgilab borasiz." : null} />
      ) : (
        ['lent', 'borrowed'].map((dir) => {
          const items = list.filter((d) => d.dir === dir).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (b.createdAt || 0) - (a.createdAt || 0));
          if (!items.length) return null;
          const sum = items.reduce((a, d) => a + (view === 'open' ? remaining(d) : d.amount), 0);
          return (
            <section key={dir} className="group">
              <h3 className="group-t">{DEBT_DIR[dir].group} <span>{items.length}</span><span className="day-sum">{money(sum)} so'm</span></h3>
              <ul className="list">{items.map((d) => <Row key={d.id} d={d} />)}</ul>
            </section>
          );
        })
      )}
      <button className="add-row" onClick={() => app.openSheet('debt')}><Icon name="plus" size={18} /> Qarz qo'shish</button>
    </>
  );
}

/** Oy oxiridagi qarz qoldiqlari: menga qarzdorlar va mening qarzlarim */
export function debtSeries(debts, year) {
  const cur = today().slice(0, 7);
  const lent = [];
  const borrowed = [];
  for (let i = 1; i <= 12; i++) {
    const key = `${year}-${String(i).padStart(2, '0')}`;
    if (key > cur) {
      lent.push(null);
      borrowed.push(null);
      continue;
    }
    const end = `${key}-31`;
    let l = 0;
    let b = 0;
    for (const d of debts) {
      if (!d.date || d.date > end) continue;
      const back = (d.payments || []).filter((p) => p.date <= end).reduce((s, p) => s + (p.amount || 0), 0);
      const left = Math.max(0, (d.amount || 0) - back);
      if (d.dir === 'lent') l += left;
      else b += left;
    }
    lent.push(l);
    borrowed.push(b);
  }
  return { lent, borrowed };
}

export function DebtDynamics({ year = new Date().getFullYear(), title = 'Qarzlar dinamikasi' }) {
  const db = useData();
  if (!db.debts.length) return null;
  const s = debtSeries(db.debts, year);
  const series = [
    { name: 'Menga qarzdorlar', color: 'var(--ch-lent)', values: s.lent },
    { name: 'Mening qarzlarim', color: 'var(--ch-borrow)', values: s.borrowed },
  ];
  const n = s.borrowed.filter((x) => x != null);
  const firstB = n[0] ?? 0;
  const lastB = n[n.length - 1] ?? 0;
  return (
    <section className="card report-card">
      <div className="card-head">
        <h2>{title}</h2>
        {n.length > 1 && firstB !== lastB && <span className="card-meta">qarzim {lastB < firstB ? `${short(firstB - lastB)} kamaydi` : `${short(lastB - firstB)} oshdi`}</span>}
      </div>
      <LineChart series={series} label={`${year}-yil qarzlar o'zgarishi`} />
      <p className="muted small">Har oy oxirida qancha qarz qolgani. Qisman qaytarilgan pullar ham hisobga olingan.</p>
    </section>
  );
}
