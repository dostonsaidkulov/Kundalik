import { useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Sheet, Field, DeleteButton, Icon, Empty } from './ui.jsx';
import { hashStr, today, norm } from './util.js';

/** Kun nasihati: har kuni bittasi, muhimlari ko'proq chiqadi */
export function adviceForDate(list, dateStr) {
  if (!list.length) return null;
  const pool = [...list, ...list.filter((a) => a.important)];
  return pool[hashStr('nasihat' + dateStr) % pool.length];
}

export function AdviceSheet({ id }) {
  const db = useData();
  const app = useApp();
  const old = id && db.advice.find((a) => a.id === id);
  const [f, setF] = useState({ text: '', source: '', important: false, ...(old || {}) });
  const sources = [...new Set(db.advice.map((a) => a.source).filter(Boolean))];
  const save = () => {
    if (!f.text.trim()) return;
    const d = { text: f.text.trim(), source: (f.source || '').trim(), important: !!f.important };
    if (old) db.update('advice', id, d);
    else db.add('advice', d);
    app.closeSheet();
    app.toast(old ? 'Nasihat saqlandi' : 'Nasihat yozib qo\'yildi');
  };
  return (
    <Sheet title={old ? 'Nasihat' : 'Yangi nasihat'} onClose={app.closeSheet}
      footer={<>
        <div className="foot-left">{old && <DeleteButton onDelete={() => { db.remove('advice', id); app.closeSheet(); app.toast("Nasihat o'chirildi"); }} />}</div>
        <button type="button" className="btn primary" onClick={save} disabled={!f.text.trim()}>Saqlash</button>
      </>}>
      <Field label="O'zimga nasihat" htmlFor="adv-text">
        <textarea id="adv-text" rows={5} value={f.text} onChange={(e) => setF((s) => ({ ...s, text: e.target.value }))} placeholder="Masalan: Javob berishdan oldin bir daqiqa o'ylab ol." />
      </Field>
      <Field label="Qayerdan (ixtiyoriy)" htmlFor="adv-src" hint="O'z tajribangizdanmi, kitobdanmi yoki biror insondanmi">
        <input id="adv-src" list="adv-sources" value={f.source} onChange={(e) => setF((s) => ({ ...s, source: e.target.value }))} placeholder="Masalan: O'z tajribam, otamdan" />
        <datalist id="adv-sources">{sources.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <label className="switch-row">
        <span>
          <b>Muhim</b>
          <span className="muted small">Ro'yxat boshida turadi va kun nasihati sifatida ko'proq chiqadi</span>
        </span>
        <input type="checkbox" className="switch" checked={!!f.important} onChange={(e) => setF((s) => ({ ...s, important: e.target.checked }))} />
      </label>
    </Sheet>
  );
}

export function AdviceList() {
  const db = useData();
  const app = useApp();
  const [q, setQ] = useState('');
  const todays = adviceForDate(db.advice, today());
  const list = db.advice
    .filter((a) => !q || norm(a.text + ' ' + (a.source || '')).includes(norm(q)))
    .sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0));
  if (!db.advice.length)
    return (
      <>
        <Empty icon="sparkle" title="Nasihatlar daftari bo'sh" text="Tajribadan chiqargan xulosalaringiz, o'zingizga bergan va'dalaringiz, eslab yurmoqchi bo'lgan qoidalaringizni shu yerga yozing. Har kuni bittasi bosh sahifada chiqib turadi." action={<button className="btn soft" onClick={() => app.openSheet('advice')}>Birinchi nasihatni yozish</button>} />
      </>
    );
  return (
    <>
      {todays && !q && (
        <button className="advice-today" onClick={() => app.openSheet('advice', { id: todays.id })}>
          <span className="at-label"><Icon name="sparkle" size={15} /> Bugungi nasihat</span>
          <span className="at-text">{todays.text}</span>
        </button>
      )}
      {db.advice.length > 5 && (
        <div className="filters">
          <div className="search-in">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nasihatlardan qidirish" aria-label="Nasihatlardan qidirish" />
          </div>
        </div>
      )}
      <ol className="advice-list">
        {list.map((a) => (
          <li key={a.id}>
            <button className={'advice' + (a.important ? ' imp' : '')} onClick={() => app.openSheet('advice', { id: a.id })}>
              <span className="adv-text">{a.text}</span>
              {(a.source || a.important) && (
                <span className="adv-meta">
                  {a.important && <span className="adv-imp">Muhim</span>}
                  {a.source}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <button className="add-row" onClick={() => app.openSheet('advice')}><Icon name="plus" size={18} /> Nasihat qo'shish</button>
    </>
  );
}

export function AdviceOfDay() {
  const db = useData();
  const app = useApp();
  const a = adviceForDate(db.advice, today());
  if (!a) return null;
  return (
    <section className="card advice-card" onClick={() => app.openSheet('advice', { id: a.id })}>
      <div className="card-head">
        <span className="card-ic" style={{ '--sc': 'var(--c-thoughts)' }}><Icon name="sparkle" size={18} /></span>
        <h2>Kun nasihati</h2>
        <button className="link" onClick={(e) => { e.stopPropagation(); app.go('thoughts', 'advice'); }}>Hammasi</button>
      </div>
      <p className="advice-big">{a.text}</p>
      {a.source && <div className="q-src">{a.source}</div>}
    </section>
  );
}
