import { useEffect, useRef, useState } from 'react';
import { money, MONTHS } from './util.js';

// Qisqa summa: 12,5 mln / 450 ming
export function short(v) {
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' mlrd';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',').replace(',0', '') + ' mln';
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' ming';
  return s + Math.round(a);
}

function niceTicks(min, max, count = 4) {
  if (min === max) max = min + 1;
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return ticks;
}

/**
 * 12 oylik chiziqli grafik. series: [{ name, color, values: (number|null)[12] }]
 * Kelajakdagi oylar null bo'ladi va chizilmaydi.
 */
export function LineChart({ series, height = 190, label }) {
  const wrap = useRef(null);
  const [w, setW] = useState(340);
  const [idx, setIdx] = useState(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 340));
    ro.observe(el);
    setW(el.clientWidth || 340);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values.filter((v) => v != null));
  if (!all.length) return null;
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const pad = { l: 52, r: 12, t: 10, b: 24 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (iw * i) / 11;
  const y = (v) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const lastIdx = Math.max(...series.map((s) => s.values.reduce((m, v, i) => (v != null ? i : m), -1)));
  const active = idx != null && idx <= lastIdx ? idx : null;

  const path = (vals) => {
    let d = '';
    vals.forEach((v, i) => {
      if (v == null) return;
      d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
    });
    return d;
  };
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - pad.l) / iw) * 11);
    setIdx(Math.max(0, Math.min(11, i)));
  };

  return (
    <div className="lc" ref={wrap}>
      <div className="lc-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
      <div className="lc-box">
        <svg width={w} height={height} role="img" aria-label={label} onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setIdx(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className={'lc-grid' + (t === 0 ? ' zero' : '')} />
              <text x={pad.l - 8} y={y(t) + 4} className="lc-ytick">{short(t)}</text>
            </g>
          ))}
          {MONTHS.map((m, i) => (i % 2 === 0 || w > 520) && (
            <text key={m} x={x(i)} y={height - 6} className="lc-xtick">{m.slice(0, 3)}</text>
          ))}
          {active != null && <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + ih} className="lc-cross" />}
          {series.map((s) => (
            <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s) => {
            const i = active != null ? active : s.values.reduce((m, v, k) => (v != null ? k : m), -1);
            if (i < 0 || s.values[i] == null) return null;
            return <circle key={s.name} cx={x(i)} cy={y(s.values[i])} r="4.5" fill={s.color} className="lc-dot" />;
          })}
        </svg>
        {active != null && (
          <div className="lc-tip" style={{ left: Math.min(Math.max(x(active), 90), w - 90) }}>
            <b>{MONTHS[active]}</b>
            {series.map((s) => s.values[active] != null && (
              <span key={s.name}><i style={{ background: s.color }} />{s.name}: <em>{money(s.values[active])}</em></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
