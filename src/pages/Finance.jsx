import { useState } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Segmented, Empty, Check } from '../ui.jsx';
import { today, monthKey, shiftMonth, monthLabel, money, fmtDate, catColor, MONTHS } from '../util.js';
import { monthTotals, limitState } from '../finance-logic.js';

export default function Finance({ sub, setSub }) {
  const app = useApp();
  const db = useData();
  const tab = sub || 'tx';
  const [key, setKey] = useState(monthKey(today()));
  const shopLeft = db.shop.filter((s) => !s.bought).length;
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
      <Segmented options={[{ v: 'tx', l: 'Hisob' }, { v: 'shop', l: 'Bozorlik', n: shopLeft || null }, { v: 'report', l: 'Hisobot' }]} value={tab} onChange={setSub} />
      {tab !== 'shop' && (
        <div className="month-switch">
          <button className="icon-btn" onClick={() => setKey(shiftMonth(key, -1))} aria-label="Oldingi oy"><Icon name="left" /></button>
          <span>{monthLabel(key)}</span>
          <button className="icon-btn" onClick={() => setKey(shiftMonth(key, 1))} disabled={key >= monthKey(today())} aria-label="Keyingi oy"><Icon name="right" /></button>
        </div>
      )}
      {tab === 'tx' && <Ledger mkey={key} />}
      {tab === 'shop' && <Shopping />}
      {tab === 'report' && <Report mkey={key} />}
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
  const cats = (t) => (t.type === 'income' ? db.settings.incomeCats : db.settings.expenseCats);
  return (
    <>
      <div className="summary">
        <div className="sum-main">
          <span>Oy qoldig'i</span>
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
          const dayOut = d.items.filter((t) => t.type !== 'income').reduce((a, t) => a + t.amount, 0);
          return (
            <section key={d.date} className="group">
              <h3 className="group-t">{fmtDate(d.date)}{dayOut > 0 && <span className="day-sum">−{money(dayOut)}</span>}</h3>
              <ul className="list">
                {d.items.map((t) => (
                  <li key={t.id} className="tx-row" onClick={() => app.openSheet('tx', { id: t.id })}>
                    <span className="tx-ic" style={{ '--cc': catColor(t.cat, cats(t)) }}>
                      <Icon name={t.type === 'income' ? 'up' : 'down'} size={16} />
                    </span>
                    <div className="tr-main">
                      <div className="tr-title">{t.cat}</div>
                      {t.note && <div className="tr-sub">{t.note}</div>}
                    </div>
                    <span className={'tx-amt ' + (t.type === 'income' ? 'in' : 'out')}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</span>
                  </li>
                ))}
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
  const add = () => {
    const n = name.trim();
    if (!n) return;
    // "Guruch 2 kg" -> nom va miqdor
    const m = n.match(/^(.*?)\s+(\d+[.,]?\d*\s*(kg|g|gr|l|litr|ta|dona|quti|paket|bog'?)?)$/i);
    db.add('shop', { name: m ? m[1] : n, qty: m ? m[2] : '', price: 0, bought: false });
    setName('');
  };
  const sumBought = bought.reduce((a, s) => a + (s.price || 0), 0);
  const sumAll = db.shop.reduce((a, s) => a + (s.price || 0), 0);
  const Item = ({ s }) => (
    <li className={'shop-row' + (s.bought ? ' is-done' : '')} onClick={() => db.update('shop', s.id, { bought: !s.bought })}>
      <Check state={s.bought ? 'done' : 'todo'} color="var(--c-money)" onClick={() => db.update('shop', s.id, { bought: !s.bought })} label="Olindi" />
      <div className="tr-main">
        <div className="tr-title">{s.name}</div>
        {s.qty && <div className="tr-sub">{s.qty}</div>}
      </div>
      {s.price > 0 && <span className="shop-price">{money(s.price)}</span>}
      <button className="icon-btn sm" onClick={(e) => { e.stopPropagation(); app.openSheet('shop', { id: s.id }); }} aria-label="Tahrirlash"><Icon name="edit" size={16} /></button>
    </li>
  );
  return (
    <>
      <div className="inline-add big">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mahsulot, masalan: Guruch 2 kg" onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Mahsulot nomi" />
        <button className="btn primary" onClick={add} disabled={!name.trim()} aria-label="Qo'shish"><Icon name="plus" size={18} /></button>
      </div>
      {db.shop.length === 0 ? (
        <Empty icon="cart" title="Ro'yxat bo'sh" text="Bozorga borishdan oldin kerakli narsalarni yozib qo'ying. Do'konda olganlaringizni belgilab borasiz." />
      ) : (
        <>
          {left.length > 0 && (
            <section className="group">
              <h3 className="group-t">Olinadi <span>{left.length}</span></h3>
              <ul className="list">{left.map((s) => <Item key={s.id} s={s} />)}</ul>
            </section>
          )}
          {bought.length > 0 && (
            <section className="group">
              <h3 className="group-t">Olindi <span>{bought.length}</span>{sumBought > 0 && <span className="day-sum">{money(sumBought)} so'm</span>}</h3>
              <ul className="list">{bought.map((s) => <Item key={s.id} s={s} />)}</ul>
            </section>
          )}
          {sumAll > 0 && <p className="muted small center">Narxi yozilganlar bo'yicha taxminiy jami: {money(sumAll)} so'm</p>}
        </>
      )}
      {bought.length > 0 && (
        <div className="shop-actions">
          <button className="btn ghost" onClick={() => { bought.forEach((s) => db.remove('shop', s.id)); app.toast(`${bought.length} ta mahsulot ro'yxatdan olindi`); }}>
            <Icon name="trash" size={18} /> Olinganlarni o'chirish
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
