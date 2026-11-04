import { useEffect, useRef, useState } from 'react';
import { money, parseMoney } from './util.js';

const P = {
  home: ['M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z'],
  tasks: ['M8.5 11.5l2.8 2.8L19.5 6', 'M20 12.5V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V7a2.5 2.5 0 0 1 2.5-2.5h8'],
  wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3', 'M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 5.5', 'M16 13.8h.01'],
  book: ['M5 18.5V6a2.5 2.5 0 0 1 2.5-2.5H19v13H7.5A2.5 2.5 0 0 0 5 19a2.5 2.5 0 0 0 2.5 2.5H19', 'M9 7.5h6'],
  bulb: ['M9.5 18h5', 'M10.5 21h3', 'M12 3a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6V16.5h6v-.1c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 3z'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4.5-4.5'],
  settings: ['M4 7h8.5', 'M17.5 7H20', 'M15 9.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z', 'M4 17h2.5', 'M11.5 17H20', 'M9 19.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z'],
  back: ['M15 18l-6-6 6-6'],
  left: ['M14.5 17l-5-5 5-5'],
  right: ['M9.5 7l5 5-5 5'],
  trash: ['M4.5 7h15', 'M10 11v6', 'M14 11v6', 'M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12', 'M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2'],
  edit: ['M4.5 19.5h4l10-10-4-4-10 10z', 'M13 7l4 4'],
  cart: ['M3.5 4.5h2l2.2 10.3a1 1 0 0 0 1 .7h8.6a1 1 0 0 0 1-.7L20 8.5H6.4', 'M9.5 20.2a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4z', 'M17 20.2a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4z'],
  bell: ['M6.5 9a5.5 5.5 0 0 1 11 0c0 5.5 2.5 7.5 2.5 7.5H4S6.5 14.5 6.5 9z', 'M10 20a2 2 0 0 0 4 0'],
  x: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  quote: ['M6 17c2.5-1 4-3.2 4-6.5V7H5.5v4.5H10', 'M14 17c2.5-1 4-3.2 4-6.5V7h-4.5v4.5H18'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z'],
  calendar: ['M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1z', 'M4 10.5h16', 'M8.5 4v4', 'M15.5 4v4'],
  up: ['M12 19V5.5', 'M6.5 11 12 5.5l5.5 5.5'],
  down: ['M12 5v13.5', 'M6.5 13l5.5 5.5 5.5-5.5'],
  check: ['M5.5 12.5l4.2 4.2L18.5 8'],
  logout: ['M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5', 'M10 8l-4 4 4 4', 'M6 12h9.5'],
  flag: ['M5.5 21V4.5', 'M5.5 4.5h11l-2 4 2 4h-11'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7.5V12l3 2'],
  sparkle: ['M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z', 'M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  chart: ['M4.5 19.5h15', 'M7 16v-4', 'M11 16V8', 'M15 16v-6', 'M19 16V5.5'],
  list: ['M9 6.5h10.5', 'M9 12h10.5', 'M9 17.5h10.5', 'M5 6.5h.01', 'M5 12h.01', 'M5 17.5h.01'],
};

export function Icon({ name, size = 22, stroke = 1.8, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(P[name] || []).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function Sheet({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector('input:not([type=checkbox]):not([type=date]):not([type=time]), textarea');
    if (first && window.matchMedia('(min-width: 720px)').matches) first.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Segmented({ options, value, onChange, small }) {
  return (
    <div className={'seg' + (small ? ' small' : '')} role="tablist">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)} type="button">
          {o.l}
          {o.n != null && <span className="seg-n">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, color }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.v;
        const l = typeof o === 'string' ? o : o.l;
        return (
          <button type="button" key={v} className={'chip' + (value === v ? ' on' : '')} style={value === v && color ? { '--chip': color(v) } : undefined} onClick={() => onChange(v)}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Progress({ value, color, thin }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={'progress' + (thin ? ' thin' : '')} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: v * 100 + '%', background: color }} />
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 20 }) {
  return (
    <div className="stars" aria-label={onChange ? undefined : `${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        onChange ? (
          <button key={n} type="button" className={n <= value ? 'on' : ''} onClick={() => onChange(n === value ? 0 : n)} aria-label={`${n} yulduz`}>
            <Star size={size} />
          </button>
        ) : (
          <span key={n} className={n <= value ? 'on' : ''}><Star size={size} /></span>
        )
      ))}
    </div>
  );
}

function Star({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" />
    </svg>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-ic">
        <Icon name={icon} size={26} />
      </div>
      <div className="empty-t">{title}</div>
      {text && <div className="empty-x">{text}</div>}
      {action}
    </div>
  );
}

export function DeleteButton({ onDelete, label = "O'chirish" }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!ask) return;
    const t = setTimeout(() => setAsk(false), 4000);
    return () => clearTimeout(t);
  }, [ask]);
  return ask ? (
    <button type="button" className="btn danger" onClick={onDelete}>
      Ha, o'chirilsin
    </button>
  ) : (
    <button type="button" className="btn ghost danger-text" onClick={() => setAsk(true)}>
      <Icon name="trash" size={18} /> {label}
    </button>
  );
}

export function MoneyInput({ value, onChange, id, autoFocus }) {
  return (
    <div className="money-input">
      <input
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder="0"
        value={value ? money(value) : ''}
        onChange={(e) => onChange(parseMoney(e.target.value))}
      />
      <span>so'm</span>
    </div>
  );
}

export function Check({ state = 'todo', onClick, color, label }) {
  return (
    <button type="button" className={'check ' + state} style={{ '--c': color }} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} aria-pressed={state === 'done'}>
      {state === 'done' && <Icon name="check" size={15} stroke={2.6} />}
    </button>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="sec-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function TagInput({ value = [], onChange, id }) {
  const [text, setText] = useState('');
  const add = () => {
    const parts = text.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setText('');
  };
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="tag">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`${t} tegini olib tashlash`}>
            <Icon name="x" size={12} stroke={2.4} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        placeholder={value.length ? '' : 'teg yozib Enter bosing'}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) {
            const parts = v.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
            if (parts.length) onChange([...new Set([...value, ...parts])]);
            setText('');
          } else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
      />
    </div>
  );
}
