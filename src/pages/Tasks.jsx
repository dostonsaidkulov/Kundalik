import { useState } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Segmented, Check, Empty } from '../ui.jsx';
import { today, addDays, fmtDate, PRIORITY, REMIND } from '../util.js';

export function TaskRow({ t, showPlan = true }) {
  const db = useData();
  const app = useApp();
  const plan = showPlan && t.planId && db.plans.find((p) => p.id === t.planId);
  const tday = today();
  const overdue = t.status !== 'done' && t.due && t.due < tday;
  const toggle = () => db.update('tasks', t.id, { status: t.status === 'done' ? 'todo' : 'done' });
  return (
    <li className={'task-row' + (t.status === 'done' ? ' is-done' : '')} onClick={() => app.openSheet('task', { id: t.id })}>
      <Check state={t.status} color="var(--c-tasks)" onClick={toggle} label={t.status === 'done' ? 'Qaytadan ochish' : 'Bajarildi deb belgilash'} />
      <div className="tr-main">
        <div className="tr-title">{t.title}</div>
        <div className="tr-meta">
          {t.status === 'doing' && <span className="pill doing">Jarayonda</span>}
          {t.due && <span className={overdue ? 'danger-text' : ''}><Icon name="calendar" size={13} /> {fmtDate(t.due)}{t.time ? `, ${t.time}` : ''}</span>}
          {t.remind && t.remind !== 'none' && t.due && <span title={REMIND[t.remind]}><Icon name="bell" size={13} /></span>}
          {plan && <span className="pill plan"><Icon name="target" size={12} /> {plan.title}</span>}
          {t.note && <span className="tr-note">{t.note}</span>}
        </div>
      </div>
      <span className={'prio ' + (t.priority || 'mid')} title={PRIORITY[t.priority || 'mid'].label}>
        {t.priority === 'high' ? 'Muhim' : ''}
      </span>
    </li>
  );
}

const sortTasks = (a, b) =>
  PRIORITY[a.priority || 'mid'].order - PRIORITY[b.priority || 'mid'].order ||
  (a.time || '99').localeCompare(b.time || '99') ||
  (a.createdAt || 0) - (b.createdAt || 0);

export default function Tasks() {
  const db = useData();
  const app = useApp();
  const [view, setView] = useState('open');
  const t = today();
  const tom = addDays(t, 1);
  const open = db.tasks.filter((x) => x.status !== 'done');
  const done = db.tasks.filter((x) => x.status === 'done').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const groups = [
    { k: 'over', l: "Muddati o'tgan", f: (x) => x.due && x.due < t, cls: 'danger' },
    { k: 'today', l: 'Bugun', f: (x) => x.due === t },
    { k: 'tom', l: 'Ertaga', f: (x) => x.due === tom },
    { k: 'later', l: 'Keyinroq', f: (x) => x.due && x.due > tom },
    { k: 'none', l: 'Muddatsiz', f: (x) => !x.due },
  ];

  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">{open.length} ta ochiq</div>
          <h1>Vazifalar</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.push('search')} aria-label="Qidirish"><Icon name="search" /></button>
        </div>
      </header>
      <Segmented options={[{ v: 'open', l: 'Ochiq', n: open.length }, { v: 'done', l: 'Bajarilgan', n: done.length }]} value={view} onChange={setView} />

      {view === 'open' && (
        open.length === 0 ? (
          <Empty icon="tasks" title="Hamma vazifa bajarilgan" text="Yangi vazifa qo'shish uchun pastdagi + tugmasini bosing." />
        ) : (
          groups.map((g) => {
            const items = open.filter(g.f).sort(g.k === 'later' ? (a, b) => a.due.localeCompare(b.due) || sortTasks(a, b) : sortTasks);
            if (!items.length) return null;
            return (
              <section key={g.k} className="group">
                <h3 className={'group-t ' + (g.cls || '')}>{g.l} <span>{items.length}</span></h3>
                <ul className="list">{items.map((x) => <TaskRow key={x.id} t={x} />)}</ul>
              </section>
            );
          })
        )
      )}
      {view === 'done' && (
        done.length === 0 ? (
          <Empty icon="check" title="Hali bajarilgan vazifa yo'q" />
        ) : (
          <ul className="list">{done.slice(0, 100).map((x) => <TaskRow key={x.id} t={x} />)}</ul>
        )
      )}
      <button className="add-row" onClick={() => app.openSheet('task')}><Icon name="plus" size={18} /> Vazifa qo'shish</button>
    </div>
  );
}
