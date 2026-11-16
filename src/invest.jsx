import { useMemo, useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Icon, Segmented, Empty } from './ui.jsx';
import { LineChart, short } from './chart.jsx';
import { balances, accOf } from './accounts.jsx';
import { today as todayStr, monthKey, shiftMonth, monthLabel, dateStr, money, MONTHS } from './util.js';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Investitsiya hisoblarining oyma-oy qiymati.
 * year berilsa — o'sha yilning 12 oyi, aks holda so'nggi 12 oy.
 * Hisob ochilmasdan oldingi oylar null (grafikda chizilmaydi).
 * O'zgarish = sof kiritilgan pul (o'tkazmalar, kirim/chiqim, boshlang'ich qoldiq) + foyda/zarar («Qiymat» yozuvlari).
 */
export function investDynamics(accounts, tx, { accId, year } = {}) {
  const set = accounts.filter((a) => a.type === 'invest' && (accId ? a.id === accId : !a.archived));
  if (!set.length) return null;
  const ids = new Set(set.map((a) => a.id));
  const today = todayStr();
  const curM = monthKey(today);
  const keys = [];
  if (year) for (let m = 1; m <= 12; m++) keys.push(`${year}-${pad(m)}`);
  else for (let k = 11; k >= 0; k--) keys.push(shiftMonth(curM, -k));
  const cutoff = (k) => (k === curM ? today : `${k}-31`);

  // Hisob qachondan beri bor: ochilgan sana yoki eng birinchi yozuv
  const start = {};
  for (const a of set) start[a.id] = a.createdAt ? dateStr(new Date(a.createdAt)) : '0000-00-00';
  for (const t of tx) {
    if (!t.date) continue;
    const touch = t.type === 'transfer' ? [t.from, t.to] : [accOf(t)];
    for (const id of touch) if (ids.has(id) && t.date < start[id]) start[id] = t.date;
  }
  const valuesAt = (cut) => {
    const b = balances(set, tx, cut);
    const per = {};
    let total = 0;
    let any = false;
    for (const a of set) {
      if (cut < start[a.id]) {
        per[a.id] = null;
        continue;
      }
      per[a.id] = b[a.id] || 0;
      total += per[a.id];
      any = true;
    }
    return { per, total: any ? total : null };
  };

  const baseCut = `${shiftMonth(keys[0], -1)}-31`;
  const base = valuesAt(baseCut);
  const flow = Object.fromEntries(keys.map((k) => [k, { contrib: 0, profit: 0 }]));
  for (const t of tx) {
    if (!t.date || t.date > today) continue;
    const f = flow[t.date.slice(0, 7)];
    if (!f) continue;
    const v = t.amount || 0;
    if (t.type === 'transfer') {
      const fromIn = ids.has(t.from);
      const toIn = ids.has(t.to);
      if (toIn && !fromIn) f.contrib += v;
      else if (fromIn && !toIn) f.contrib -= v;
    } else if (ids.has(accOf(t))) {
      if (t.type === 'adjust') f.profit += v;
      else if (t.type === 'income') f.contrib += v;
      else if (t.type === 'expense') f.contrib -= v;
    }
  }
  for (const a of set) {
    const st = start[a.id];
    if (st > baseCut && st <= today && flow[monthKey(st)]) flow[monthKey(st)].contrib += a.initial || 0;
  }

  let prev = base.total;
  const rows = keys.map((k) => {
    if (k > curM) return null;
    const v = valuesAt(cutoff(k));
    const r = { key: k, total: v.total, per: v.per, delta: v.total == null ? null : v.total - (prev || 0), ...flow[k] };
    if (v.total != null) prev = v.total;
    return r;
  });
  const live = rows.filter((r) => r && r.total != null);
  const startVal = base.total || 0;
  const endVal = live.length ? live[live.length - 1].total : startVal;
  const contrib = keys.reduce((s, k) => s + flow[k].contrib, 0);
  const profit = keys.reduce((s, k) => s + flow[k].profit, 0);
  const denom = startVal + Math.max(0, contrib);
  return {
    set,
    keys,
    rows,
    points: live.length,
    hasBase: base.total != null,
    startVal,
    endVal,
    change: endVal - startVal,
    contrib,
    profit,
    pct: denom > 0 ? (profit / denom) * 100 : null,
    rolling: !year,
    past: !!year && year < new Date().getFullYear(),
  };
}

const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const signed = (v) => sign(v) + money(Math.abs(v));
const signedShort = (v) => sign(v) + short(Math.abs(v));
const tileNum = (v, withSign) => (Math.abs(v) >= 1e7 ? (withSign ? signedShort(v) : short(v)) : withSign ? signed(v) : money(v));
const fmtPct = (p) => (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(Math.abs(p) < 10 ? 1 : 0).replace('.', ',') + '%';
const PALETTE = ['#3A63D8', '#12805C', '#7B4FD0', '#C23B6A'];

export function InvestDynamics({ accId, year, compact }) {
  const db = useData();
  const app = useApp();
  const r = useMemo(() => investDynamics(db.accounts, db.tx, { accId, year }), [db.accounts, db.tx, accId, year]);
  if (!r) return null;

  const series = [{ name: accId ? r.set[0].name : 'Jami investitsiya', color: 'var(--ch-inv)', values: r.rows.map((x) => (x ? x.total : null)) }];
  if (!accId && r.set.length > 1 && r.set.length <= 4) {
    r.set.forEach((a, n) => series.push({ name: a.name, color: PALETTE[n % PALETTE.length], values: r.rows.map((x) => (x ? x.per[a.id] : null)) }));
  }
  const labels = r.keys.map((k) => MONTHS[Number(k.slice(5)) - 1].slice(0, 3));
  const tips = r.keys.map((k) => monthLabel(k));
  const rowsDesc = r.rows.filter((x) => x && x.total != null).reverse();

  return (
    <section className="card report-card inv-dyn">
      <div className="card-head">
        <span className="card-ic" style={{ '--sc': 'var(--c-books)' }}><Icon name="trend" size={18} /></span>
        <h2>Investitsiyalar dinamikasi</h2>
      </div>
      <div className="inv-sum">
        <div><span>{r.rolling ? '12 oy oldin' : 'Yil boshida'}</span><b title={money(r.startVal)}>{r.hasBase ? tileNum(r.startVal) : '—'}</b></div>
        <div><span>{r.past ? 'Yil oxirida' : 'Hozir'}</span><b title={money(r.endVal)}>{tileNum(r.endVal)}</b></div>
        <div><span>O'zgarish</span><b className={r.change >= 0 ? 'pos' : 'neg'} title={signed(r.change)}>{tileNum(r.change, true)}</b></div>
      </div>
      {r.points > 0 && <LineChart series={series} labels={labels} tips={tips} height={compact ? 160 : 210} label="Investitsiyalar qiymati oylar bo'yicha" />}
      <div className="inv-split">
        <div><span>Sof kiritilgan</span><b>{signed(r.contrib)}</b></div>
        <div>
          <span>Foyda / zarar</span>
          <b className={r.profit >= 0 ? 'pos' : 'neg'}>
            {signed(r.profit)}
            {r.pct != null && r.profit !== 0 && <small> ({fmtPct(r.pct)})</small>}
          </b>
        </div>
      </div>
      {r.points < 3 && (
        <p className="muted small">Grafik to'liq bo'lishi uchun investitsiya hisobi sahifasidagi «Qiymat» tugmasi orqali joriy qiymatni har oy yangilab boring.</p>
      )}
      {!compact && rowsDesc.length > 0 && (
        <ul className="list inv-rows">
          {rowsDesc.map((x) => (
            <li key={x.key}>
              <div className="tr-main">
                <div className="tr-title">{monthLabel(x.key)}</div>
                <div className="tr-sub">
                  {[x.contrib ? `kiritildi ${signedShort(x.contrib)}` : '', x.profit ? `${x.profit > 0 ? 'foyda' : 'zarar'} ${signedShort(x.profit)}` : '']
                    .filter(Boolean)
                    .join(' · ') || "o'zgarish yo'q"}
                </div>
              </div>
              <div className="inv-row-r">
                <b>{money(x.total)}</b>
                {x.delta !== 0 && <span className={x.delta > 0 ? 'pos' : 'neg'}>{signed(x.delta)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {compact && (
        <button type="button" className="link inv-more" onClick={() => app.push('invest', { acc: accId, year })}>
          Oyma-oy batafsil <Icon name="right" size={16} />
        </button>
      )}
    </section>
  );
}

export function InvestPage({ acc, year }) {
  const db = useData();
  const app = useApp();
  const y = new Date().getFullYear();
  const [period, setPeriod] = useState(year ? String(year) : 'r');
  const [a, setA] = useState(acc || '');
  const inv = db.accounts.filter((x) => x.type === 'invest' && (!x.archived || x.id === acc));
  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
      </header>
      <div className="page-head">
        <div className="eyebrow">Moliya</div>
        <h1 className="h-inline">Investitsiyalar dinamikasi</h1>
      </div>
      <Segmented
        small
        options={[{ v: 'r', l: "So'nggi 12 oy" }, { v: String(y), l: `${y}-yil` }, { v: String(y - 1), l: `${y - 1}-yil` }]}
        value={period}
        onChange={setPeriod}
      />
      {inv.length > 1 && (
        <div className="chips inv-chips">
          {[{ id: '', name: 'Hammasi' }, ...inv].map((x) => (
            <button key={x.id || 'all'} type="button" className={'chip' + (a === x.id ? ' on' : '')} onClick={() => setA(x.id)}>{x.name}</button>
          ))}
        </div>
      )}
      {inv.length === 0 ? (
        <Empty icon="trend" title="Investitsiya hisobi yo'q" text="Moliya → Hisob qo'shish orqali «Investitsiya» turidagi hisob oching." />
      ) : (
        <InvestDynamics accId={a || undefined} year={period === 'r' ? undefined : Number(period)} />
      )}
      <p className="muted small">
        Har oy oxiridagi qiymat. «Sof kiritilgan» — investitsiyaga o'tkazilgan pul (chiqarilgani ayirilgan). «Foyda / zarar» — «Qiymat» tugmasi bilan kiritilgan o'zgarishlar.
      </p>
    </div>
  );
}
