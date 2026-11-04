import { useState } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Segmented, Chips, Empty, Progress, Check } from '../ui.jsx';
import { IDEA_STATUS, fmtDate, today, daysBetween, planProgress, stepDone, newId, dateStr } from '../util.js';
import { TaskRow } from './Tasks.jsx';

export default function Thoughts({ sub, setSub }) {
  const app = useApp();
  const db = useData();
  const tab = sub || 'ideas';
  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">{db.ideas.length} ta g'oya · {db.plans.length} ta reja</div>
          <h1>Fikrlar</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.push('search')} aria-label="Qidirish"><Icon name="search" /></button>
        </div>
      </header>
      <Segmented options={[{ v: 'ideas', l: "G'oyalar" }, { v: 'plans', l: 'Rejalar' }]} value={tab} onChange={setSub} />
      {tab === 'ideas' ? <Ideas /> : <Plans />}
    </div>
  );
}

function Ideas() {
  const db = useData();
  const app = useApp();
  const [st, setSt] = useState('all');
  const [tag, setTag] = useState('');
  const tags = [...new Set(db.ideas.flatMap((i) => i.tags || []))].sort();
  const list = db.ideas.filter((i) => (st === 'all' || i.status === st) && (!tag || (i.tags || []).includes(tag)));
  return (
    <>
      <Chips options={[{ v: 'all', l: 'Hammasi' }, ...Object.entries(IDEA_STATUS).map(([v, l]) => ({ v, l }))]} value={st} onChange={setSt} />
      {tags.length > 0 && (
        <div className="tag-row">
          {tags.map((t) => (
            <button key={t} className={'tag' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <Empty icon="bulb" title={db.ideas.length ? "Bu bo'yicha g'oya yo'q" : "G'oyalar daftari bo'sh"} text="Xayolga kelgan fikrni darhol yozib qo'ying, keyin uni rejaga aylantirsa bo'ladi." action={<button className="btn soft" onClick={() => app.openSheet('idea')}>G'oya yozish</button>} />
      ) : (
        <div className="ideas">
          {list.map((i) => (
            <button key={i.id} className={'idea ' + i.status} onClick={() => app.openSheet('idea', { id: i.id })}>
              <div className="idea-top">
                <span className={'pill st-' + i.status}>{IDEA_STATUS[i.status] || ''}</span>
                <span className="idea-date">{i.createdAt ? fmtDate(dateStr(new Date(i.createdAt))) : ''}</span>
              </div>
              <div className="idea-title">{i.title}</div>
              {i.text && <div className="idea-text">{i.text}</div>}
              {(i.tags || []).length > 0 && <div className="idea-tags">{i.tags.map((t) => <span key={t}>#{t}</span>)}</div>}
            </button>
          ))}
        </div>
      )}
      <button className="add-row" onClick={() => app.openSheet('idea')}><Icon name="plus" size={18} /> G'oya qo'shish</button>
    </>
  );
}

function deadlineText(dl) {
  if (!dl) return '';
  const n = daysBetween(today(), dl);
  if (n < 0) return `Muddati ${-n} kun oldin tugagan`;
  if (n === 0) return 'Muddati bugun';
  return `${fmtDate(dl)} gacha · ${n} kun qoldi`;
}

function Plans() {
  const db = useData();
  const app = useApp();
  if (!db.plans.length)
    return (
      <Empty icon="target" title="Hali reja yo'q" text="Katta maqsadni bosqichlarga bo'ling. Har bir bosqichni vazifaga aylantirsangiz, bajarilish foizi o'zi hisoblanadi." action={<button className="btn soft" onClick={() => app.openSheet('plan')}>Reja tuzish</button>} />
    );
  return (
    <>
      <div className="plans">
        {db.plans.map((p) => {
          const pr = planProgress(p, db.tasks);
          const late = p.deadline && p.deadline < today() && pr.ratio < 1;
          return (
            <button key={p.id} className="plan-card" onClick={() => app.push('plan', { id: p.id })}>
              <div className="pc-top">
                <div className="pc-title">{p.title}</div>
                <div className="pc-pct">{Math.round(pr.ratio * 100)}%</div>
              </div>
              {p.goal && <div className="pc-goal">{p.goal}</div>}
              <Progress value={pr.ratio} color={pr.ratio >= 1 ? 'var(--ok)' : 'var(--c-thoughts)'} />
              <div className="pc-meta">
                <span>{pr.total ? `${pr.done} / ${pr.total} bosqich` : "Bosqich qo'shilmagan"}</span>
                {p.deadline && <span className={late ? 'danger-text' : ''}>{deadlineText(p.deadline)}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <button className="add-row" onClick={() => app.openSheet('plan')}><Icon name="plus" size={18} /> Reja qo'shish</button>
    </>
  );
}

export function PlanDetail({ id }) {
  const db = useData();
  const app = useApp();
  const [text, setText] = useState('');
  const p = db.plans.find((x) => x.id === id);
  if (!p) return <div className="page"><Empty icon="target" title="Reja topilmadi" /></div>;
  const steps = p.steps || [];
  const pr = planProgress(p, db.tasks);
  const stepTaskIds = new Set(steps.map((s) => s.taskId).filter(Boolean));
  const extraTasks = db.tasks.filter((t) => t.planId === id && !stepTaskIds.has(t.id));
  const idea = p.ideaId && db.ideas.find((i) => i.id === p.ideaId);

  const setSteps = (next) => db.update('plans', id, { steps: next });
  const addStep = () => {
    if (!text.trim()) return;
    setSteps([...steps, { id: newId(), text: text.trim(), done: false }]);
    setText('');
  };
  const toggle = (s) => {
    const task = s.taskId && db.tasks.find((t) => t.id === s.taskId);
    if (task) db.update('tasks', task.id, { status: task.status === 'done' ? 'todo' : 'done' });
    else setSteps(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
  };
  const toTask = (s) => {
    const tid = db.add('tasks', { title: s.text, note: '', due: '', time: '', priority: 'mid', status: s.done ? 'done' : 'todo', planId: id, remind: 'none' });
    setSteps(steps.map((x) => (x.id === s.id ? { ...x, taskId: tid } : x)));
    app.toast('Bosqich vazifalar ro\'yxatiga qo\'shildi');
    app.openSheet('task', { id: tid });
  };
  const removeStep = (s) => setSteps(steps.filter((x) => x.id !== s.id));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.openSheet('plan', { id })} aria-label="Tahrirlash"><Icon name="edit" /></button>
        </div>
      </header>
      <div className="plan-hero">
        <div className="eyebrow" style={{ color: 'var(--c-thoughts)' }}>Reja</div>
        <h1>{p.title}</h1>
        {p.goal && <p className="goal"><Icon name="flag" size={16} /> {p.goal}</p>}
        <div className="ph-progress">
          <div className="ph-pct">{Math.round(pr.ratio * 100)}<small>%</small></div>
          <div className="ph-bar">
            <Progress value={pr.ratio} color={pr.ratio >= 1 ? 'var(--ok)' : 'var(--c-thoughts)'} />
            <div className="ph-meta">
              <span>{pr.total ? `${pr.done} / ${pr.total} bosqich bajarildi` : "Bosqichlarni qo'shing"}</span>
              {p.deadline && <span>{deadlineText(p.deadline)}</span>}
            </div>
          </div>
        </div>
        {p.note && <p className="plan-note">{p.note}</p>}
        {idea && <button className="link small" onClick={() => app.openSheet('idea', { id: idea.id })}><Icon name="bulb" size={14} /> «{idea.title}» g'oyasidan tug'ilgan</button>}
      </div>

      <section className="group">
        <h3 className="group-t">Bosqichlar <span>{steps.length}</span></h3>
        <ul className="list steps">
          {steps.map((s, i) => {
            const done = stepDone(s, db.tasks);
            const task = s.taskId && db.tasks.find((t) => t.id === s.taskId);
            return (
              <li key={s.id} className={'step' + (done ? ' is-done' : '')}>
                <Check state={done ? 'done' : task?.status === 'doing' ? 'doing' : 'todo'} color="var(--c-thoughts)" onClick={() => toggle(s)} label="Bosqichni belgilash" />
                <div className="tr-main" onClick={() => task && app.openSheet('task', { id: task.id })}>
                  <div className="tr-title">{s.text}</div>
                  {task && <div className="tr-meta"><span className="pill tasklink"><Icon name="tasks" size={12} /> Vazifa{task.due ? ` · ${fmtDate(task.due)}` : ''}</span></div>}
                </div>
                <div className="step-actions">
                  {!task && !done && <button className="mini-btn" onClick={() => toTask(s)} title="Vazifaga aylantirish">Vazifaga</button>}
                  <button className="icon-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yuqoriga"><Icon name="up" size={16} /></button>
                  <button className="icon-btn sm" onClick={() => removeStep(s)} aria-label="Bosqichni o'chirish"><Icon name="x" size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="inline-add">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Yangi bosqich" onKeyDown={(e) => e.key === 'Enter' && addStep()} aria-label="Yangi bosqich" />
          <button className="btn primary" onClick={addStep} disabled={!text.trim()}>Qo'shish</button>
        </div>
      </section>

      {extraTasks.length > 0 && (
        <section className="group">
          <h3 className="group-t">Rejaga bog'langan vazifalar <span>{extraTasks.length}</span></h3>
          <ul className="list">{extraTasks.map((t) => <TaskRow key={t.id} t={t} showPlan={false} />)}</ul>
        </section>
      )}
      <button className="add-row" onClick={() => app.openSheet('task', { preset: { planId: id, due: '' } })}><Icon name="plus" size={18} /> Shu rejaga vazifa qo'shish</button>
    </div>
  );
}
