import { useState } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Segmented, Empty, Check } from '../ui.jsx';
import { today, monthKey, shiftMonth, monthLabel, money, fmtDate, catColor, MONTHS } from '../util.js';
import { monthTotals, limitState, yearTotals, parseShopList } from '../finance-logic.js';
import { Debts, isClosed } from '../debts.jsx';
import { AccountsBlock, TxRow, yearCashflow } from '../accounts.jsx';

export default function Finance({ sub, setSub }) {
  const app = useApp();
  const db = useData();
  const tab = sub || 'tx';
  const [key, setKey] = useState(monthKey(today()));
  const [period, setPeriod] = useState('year');
  const [year, setYear] = useState(new Date().getFullYear());
  const thisYear = new Date().getFullYear();
  const shopLeft = db.shop.filter((s) => !s.bought).length;
  const debtOpen = db.debts.filter((d) => !isClosed(d)).length;
  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">Shaxsiy moliya</div>
          <h1>Moliya</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.push('search')} aria-label="Qidirish"><Icon name="search" /></button>
        </div>
      </header>
      <Segmented compact options={[{ v: 'tx', l: 'Hisoblar' }, { v: 'shop', l: 'Bozorlik', n: shopLeft || null }, { v: 'debts', l: 'Qarzlar', n: debtOpen || null }, { v: 'report', l: 'Hisobot' }]} value={tab} onChange={setSub} />
      {tab === 'report' && (
        <Segmented small options={[{ v: 'month', l: 'Oylik' }, { v: 'year', l: 'Yillik' }]} value={period} onChange={setPeriod} />
      )}
      {tab === 'report' && period === 'year' && (
        <div className="month-switch">
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Oldingi yil"><Icon name="left" /></button>
          <span>{year}-yil</span>
          <button className="icon-btn" onClick={() => setYear(year + 1)} disabled={year >= thisYear} aria-label="Keyingi yil"><Icon name="right" /></button>
        </div>
      )}
      {tab === 'tx' && <AccountsBlock />}
      {(tab === 'tx' || (tab === 'report' && period === 'month')) && (
        <div className="month-switch">
          <button className="icon-btn" onClick={() => setKey(shiftMonth(key, -1))} aria-label="Oldingi oy"><Icon name="left" /></button>
          <span>{monthLabel(key)}</span>
          <button className="icon-btn" onClick={() => setKey(shiftMonth(key, 1))} disabled={key >= monthKey(today())} aria-label="Keyingi oy"><Icon name="right" /></button>
        </div>
      )}
      {tab === 'tx' && <Ledger mkey={key} />}
      {tab === 'shop' && <Shopping />}
      {tab === 'debts' && <Debts />}
      {tab === 'report' && period === 'month' && <Report mkey={key} />}
      {tab === 'report' && period === 'year' && <YearReport year={year} onMonth={(k) => { setKey(k); setPeriod('month'); }} />}
    </div>
  );
}

function Ledger({ mkey }) {
  const db = useData();
  const app = useApp();
  const m = monthTotals(db.tx, mkey);
  const list = db.tx.filter((t) => t.date && monthKey(t.date) === mkey);
  const days = [];
  for (const t of list) {
    const last = days[days.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }
  return (
    <>
      <div className="summary">
        <div className="sum-main">
          <span>Oy natijasi (kirim − chiqim)</span>
          <b className={m.balance < 0 ? 'neg' : ''}>{money(m.balance)} <small>so'm</small></b>
        </div>
        <div className="sum-io">
          <button onClick={() => app.openSheet('tx', { preset: { type: 'income' } })}>
            <span className="io-l in"><Icon name="up" size={14} /> Kirim</span>
            <b>{money(m.income)}</b>
          </button>
          <button onClick={() => app.openSheet('tx', { preset: { type: 'expense' } })}>
            <span className="io-l out"><Icon name="down" size={14} /> Chiqim</span>
            <b>{money(m.expense)}</b>
          </button>
        </div>
      </div>
      {days.length === 0 ? (
        <Empty icon="wallet" title="Bu oyda yozuv yo'q" text="Har bir kirim va chiqimni yozib borsangiz, oy oxirida pulingiz qayerga ketganini ko'rasiz." />
      ) : (
        days.map((d) => {
          const dayOut = d.items.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
          return (
            <section key={d.date} className="group">
              <h3 className="group-t">{fmtDate(d.date)}{dayOut > 0 && <span className="day-sum">−{money(dayOut)}</span>}</h3>
              <ul className="list">
                {d.items.map((t) => <TxRow key={t.id} t={t} />)}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

function Shopping() {
  const db = useData();
  const app = useApp();
  const [name, setName] = useState('');
  const left = db.shop.filter((s) => !s.bought);
  const bought = db.shop.filter((s) => s.bought);
  const addText = (text) => {
    const items = parseShopList(text);
    items.forEach((it, i) => db.add('shop', { ...it, price: 0, bought: false, pos: i }));
    if (items.length > 1) app.toast(`${items.length} ta mahsulot qo'shildi`);
    return items.length;
  };
  const add = () => {
    if (!name.trim()) return;
    addText(name);
    setName('');
  };
  const onPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (/[\n,;]/.test(text.trim())) {
      e.preventDefault();
      addText(text);
      setName('');
    }
  };
  const copyList = async () => {
    const lines = left.map((s, i) => `${i + 1}. ${s.name}${s.qty ? ' — ' + s.qty : ''}`);
    const text = "Bozorlik ro'yxati:\n" + lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      app.toast("Ro'yxat nusxalandi. Endi Telegram'ga qo'yishingiz mumkin");
    } catch {
      app.toast("Nusxalab bo'lmadi", 'warn');
    }
  };
  const sumBought = bought.reduce((a, s) => a + (s.price || 0), 0);
  const sumAll = db.shop.reduce((a, s) => a + (s.price || 0), 0);
  const Item = ({ s, n }) => (
    <li className={'shop-row' + (s.bought ? ' is-done' : '')} onClick={() => db.update('shop', s.id, { bought: !s.bought })}>
      <Check state={s.bought ? 'done' : 'todo'} color="var(--c-money)" onClick={() => db.update('shop', s.id, { bought: !s.bought })} label="Olindi" />
      <div className="tr-main">
        <div className="tr-title"><span className="num">{n}.</span> {s.name}</div>
        {s.qty && <div className="tr-sub">{s.qty}</div>}
      </div>
      {s.price > 0 && <span className="shop-price">{money(s.price)}</span>}
      <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); app.openSheet('shop', { id: s.id }); }} aria-label="Tahrirlash"><Icon name="edit" size={16} /></button>
    </li>
  );
  return (
    <>
      <div className="inline-add big">
        <input value={name} onChange={(e) => setName(e.target.value)} onPaste={onPaste} placeholder="Mahsulot, masalan: Guruch 2 kg" onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Mahsulot nomi" />
        <button className="btn primary" onClick={add} disabled={!name.trim()} aria-label="Qo'shish"><Icon name="plus" size={18} /></button>
      </div>
      <div className="shop-tools">
        <button className="btn soft" onClick={() => app.openSheet('shoplist')}><Icon name="list" size={18} /> Ro'yxatni tashlash</button>
        {left.length > 0 && <button className="btn ghost" onClick={copyList}><Icon name="quote" size={18} /> Nusxalash</button>}
      </div>
      {db.shop.length === 0 ? (
        <Empty icon="cart" title="Ro'yxat bo'sh" text="Mahsulotni yozing yoki tayyor ro'yxatni nusxalab tashlang: ilova uni o'zi mahsulotlarga ajratib, raqamlab chiqadi." />
      ) : (
        <>
          {left.length > 0 && (
            <section className="group">
              <h3 className="group-t">Olinadi <span>{left.length}</span></h3>
              <ul className="list">{left.map((s, i) => <Item key={s.id} s={s} n={i + 1} />)}</ul>
            </section>
          )}
          {bought.length > 0 && (
            <section className="group">
              <h3 className="group-t">Olindi <span>{bought.length}</span>{sumBought > 0 && <span className="day-sum">{money(sumBought)} so'm</span>}</h3>
              <ul className="list">{bought.map((s, i) => <Item key={s.id} s={s} n={i + 1} />)}</ul>
            </section>
          )}
          {sumAll > 0 && <p className="muted small center">Narxi yozilganlar bo'yicha taxminiy jami: {money(sumAll)} so'm</p>}
        </>
      )}
      {bought.length > 0 && (
        <div className="shop-actions">
          <button className="btn ghost" onClick={() => { bought.forEach((s) => db.remove('shop', s.id)); app.toast(`${bought.length} ta mahsulot ro'yxatdan olindi`); }}>
            <Icon name="trash" size={18} /> O'chirish
          </button>
          <button className="btn primary" onClick={() => app.openSheet('spend')}>
            <Icon name="wallet" size={18} /> Xarajatga yozish
          </button>
        </div>
      )}
    </>
  );
}

function Report({ mkey }) {
  const db = useData();
  const app = useApp();
  const m = monthTotals(db.tx, mkey);
  const cats = db.settings.expenseCats;
  const rows = Object.entries(m.byCat).sort((a, b) => b[1] - a[1]);
  const limitOnly = Object.keys(db.settings.limits).filter((c) => !m.byCat[c]);
  const inc = Object.entries(m.incByCat).sort((a, b) => b[1] - a[1]);
  const months = [-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(mkey, n));
  const hist = months.map((k) => ({ k, ...monthTotals(db.tx, k) }));
  const max = Math.max(1, ...hist.flatMap((h) => [h.income, h.expense]));

  return (
    <>
      <section className="card report-card">
        <div className="card-head"><h2>Chiqimlar</h2><span className="card-meta">{money(m.expense)} so'm</span></div>
        {rows.length === 0 && limitOnly.length === 0 && <div className="calm">Bu oyda chiqim yozilmagan.</div>}
        <ul className="cat-bars">
          {[...rows, ...limitOnly.map((c) => [c, 0])].map(([c, v]) => {
            const ls = limitState(db.tx, db.settings.limits, c, mkey);
            const color = catColor(c, cats);
            const width = ls ? Math.min(1, ls.ratio) : m.expense ? v / m.expense : 0;
            return (
              <li key={c}>
                <div className="cb-row">
                  <span className="dot" style={{ background: color }} />
                  <span className="cb-name">{c}</span>
                  <span className="cb-val">{money(v)}</span>
                  <span className="cb-pct">{m.expense ? Math.round((v / m.expense) * 100) : 0}%</span>
                </div>
                <div className={'cb-bar' + (ls ? ' has-limit ' + ls.level : '')}>
                  <div style={{ width: width * 100 + '%', background: ls && ls.level !== 'ok' ? undefined : color }} />
                </div>
                {ls && (
                  <div className={'cb-limit ' + ls.level}>
                    {ls.level === 'over' ? `Limit ${money(ls.spent - ls.limit)} so'mga oshdi` : `Limit: ${money(ls.limit)} · qoldi ${money(ls.limit - ls.spent)}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button className="btn soft wide" onClick={() => app.openSheet('limits')}><Icon name="settings" size={18} /> Oylik limitlarni sozlash</button>
      </section>

      {inc.length > 0 && (
        <section className="card report-card">
          <div className="card-head"><h2>Kirimlar</h2><span className="card-meta">{money(m.income)} so'm</span></div>
          <ul className="inc-list">
            {inc.map(([c, v]) => (
              <li key={c}><span>{c}</span><b>{money(v)}</b></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card report-card">
        <div className="card-head"><h2>Oxirgi 6 oy</h2></div>
        <div className="hist" role="img" aria-label="Oxirgi 6 oy kirim va chiqim">
          {hist.map((h) => (
            <div key={h.k} className={'h-col' + (h.k === mkey ? ' cur' : '')}>
              <div className="h-bars">
                <div className="h-in" style={{ height: (h.income / max) * 100 + '%' }} title={`Kirim ${money(h.income)}`} />
                <div className="h-out" style={{ height: (h.expense / max) * 100 + '%' }} title={`Chiqim ${money(h.expense)}`} />
              </div>
              <span className="h-l">{MONTHS[Number(h.k.slice(5)) - 1].slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="legend"><span><i className="h-in" /> Kirim</span><span><i className="h-out" /> Chiqim</span></div>
      </section>
    </>
  );
}

function YearReport({ year, onMonth }) {
  const db = useData();
  const y = yearTotals(db.tx, year);
  const cats = db.settings.expenseCats;
  const now = new Date();
  const monthsPassed = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0;
  const activeMonths = Math.max(1, y.months.filter((m) => m.income || m.expense).length || monthsPassed || 1);
  const rows = Object.entries(y.byCat).sort((a, b) => b[1] - a[1]);
  const inc = Object.entries(y.incByCat).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...y.months.flatMap((m) => [m.income, m.expense]));
  const top = y.months.reduce((best, m, i) => (m.expense > (best?.v || 0) ? { i, v: m.expense } : best), null);
  const curKey = monthKey(today());

  return (
    <>
      <section className="summary">
        <div className="sum-main">
          <span>{year}-yil natijasi (kirim − chiqim)</span>
          <b className={y.balance < 0 ? 'neg' : ''}>{money(y.balance)} <small>so'm</small></b>
        </div>
        <div className="sum-io static">
          <div><span className="io-l in"><Icon name="up" size={14} /> Kirim</span><b>{money(y.income)}</b></div>
          <div><span className="io-l out"><Icon name="down" size={14} /> Chiqim</span><b>{money(y.expense)}</b></div>
        </div>
        <div className="year-facts">
          <div><span>Oyiga o'rtacha chiqim</span><b>{money(y.expense / activeMonths)}</b></div>
          {top && <div><span>Eng ko'p sarflangan oy</span><b>{MONTHS[top.i]}</b></div>}
        </div>
      </section>

      <Cashflow year={year} onMonth={onMonth} />

      <section className="card report-card">
        <div className="card-head"><h2>12 oy</h2></div>
        <div className="hist year" role="img" aria-label={`${year}-yil oylar bo'yicha kirim va chiqim`}>
          {y.months.map((m, i) => {
            const k = `${year}-${String(i + 1).padStart(2, '0')}`;
            const future = k > curKey;
            return (
              <button key={k} className={'h-col' + (k === curKey ? ' cur' : '') + (future ? ' future' : '')} onClick={() => !future && onMonth(k)} disabled={future} title={`${MONTHS[i]}: kirim ${money(m.income)}, chiqim ${money(m.expense)}`}>
                <div className="h-bars">
                  <div className="h-in" style={{ height: (m.income / max) * 100 + '%' }} />
                  <div className="h-out" style={{ height: (m.expense / max) * 100 + '%' }} />
                </div>
                <span className="h-l">{MONTHS[i].slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
        <div className="legend"><span><i className="h-in" /> Kirim</span><span><i className="h-out" /> Chiqim</span><span className="muted">Oyni bossangiz, o'sha oy ochiladi</span></div>
      </section>

      <section className="card report-card">
        <div className="card-head"><h2>Chiqimlar</h2><span className="card-meta">{money(y.expense)} so'm</span></div>
        {rows.length === 0 && <div className="calm">Bu yilda chiqim yozilmagan.</div>}
        <ul className="cat-bars">
          {rows.map(([c, v]) => {
            const color = catColor(c, cats);
            return (
              <li key={c}>
                <div className="cb-row">
                  <span className="dot" style={{ background: color }} />
                  <span className="cb-name">{c}</span>
                  <span className="cb-val">{money(v)}</span>
                  <span className="cb-pct">{y.expense ? Math.round((v / y.expense) * 100) : 0}%</span>
                </div>
                <div className="cb-bar"><div style={{ width: (y.expense ? v / y.expense : 0) * 100 + '%', background: color }} /></div>
                <div className="cb-limit">Oyiga o'rtacha {money(v / activeMonths)}{db.settings.limits[c] ? ` · oylik limit ${money(db.settings.limits[c])}` : ''}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {inc.length > 0 && (
        <section className="card report-card">
          <div className="card-head"><h2>Kirimlar</h2><span className="card-meta">{money(y.income)} so'm</span></div>
          <ul className="inc-list">
            {inc.map(([c, v]) => (
              <li key={c}><span>{c}</span><b>{money(v)}</b></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Cashflow({ year, onMonth }) {
  const db = useData();
  const cf = yearCashflow(db.accounts, db.tx, year);
  const curKey = monthKey(today());
  const rows = cf.rows.filter((r) => r.key <= curKey);
  const showInv = cf.rows.some((r) => r.invest);
  const showAdj = cf.rows.some((r) => r.adjust);
  const short = (v) => {
    const a = Math.abs(v);
    if (a >= 1e6) return (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',').replace(',0', '') + ' mln';
    if (a >= 1e3) return Math.round(a / 1e3) + ' ming';
    return String(Math.round(a));
  };
  const c = (v) => (v < 0 ? '−' : '') + short(v);
  const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + short(v);
  const full = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v));
  return (
    <section className="card report-card cashflow">
      <div className="card-head"><h2>Pul oqimi (cash flow)</h2></div>
      <div className="cf-ends">
        <div><span>Yil boshida</span><b>{money(cf.start)}</b></div>
        <Icon name="arrow" size={18} />
        <div><span>{rows.length < 12 ? 'Hozir' : 'Yil oxirida'}</span><b>{money(rows.length ? rows[rows.length - 1].end : cf.start)}</b></div>
      </div>
      <div className="cf-scroll">
        <table className="cf-table">
          <thead>
            <tr><th>Oy</th><th>Kirim</th><th>Chiqim</th><th>Sof</th>{showInv && <th>Invest.</th>}<th>Qoldiq</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={() => onMonth(r.key)} className={r.key === curKey ? 'cur' : ''}>
                <td>{MONTHS[r.m - 1].slice(0, 3)}</td>
                <td className="in">{r.income ? short(r.income) : '·'}</td>
                <td>{r.expense ? short(r.expense) : '·'}</td>
                <td className={r.net > 0 ? 'in' : r.net < 0 ? 'neg' : ''}>{r.net ? sgn(r.net) : '·'}</td>
                {showInv && <td>{r.invest ? sgn(r.invest) : '·'}</td>}
                <td className="bal">{c(r.end)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Jami</td>
              <td className="in">{short(cf.income)}</td>
              <td>{short(cf.expense)}</td>
              <td className={cf.net > 0 ? 'in' : cf.net < 0 ? 'neg' : ''}>{sgn(cf.net)}</td>
              {showInv && <td>{sgn(cf.invest)}</td>}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="muted small">
        Sof = kirim − chiqim. Hisoblar orasidagi o'tkazmalar bunga kirmaydi.
        {showInv && " «Invest.» ustunida investitsiya hisobiga o'tkazilgan pul ko'rsatilgan."}
        {showAdj && ` Qoldiq to'g'rilashlari va investitsiya qiymati o'zgarishi: ${full(cf.adjust)} so'm.`}
      </p>
    </section>
  );
}
