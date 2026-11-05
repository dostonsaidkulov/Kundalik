import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Progress, Check } from '../ui.jsx';
import { greeting, fmtLongDate, today, money, monthKey, monthLabel, fmtDate, hashStr, PRIORITY, planProgress } from '../util.js';
import { monthTotals, limitAlerts } from '../finance-logic.js';
import { DEMO } from '../backend.js';
import { debtTotals } from '../debts.jsx';

export default function Home() {
  const db = useData();
  const app = useApp();
  const t = today();
  const due = db.tasks
    .filter((x) => x.status !== 'done' && x.due && x.due <= t)
    .sort((a, b) => (a.due || '').localeCompare(b.due || '') || PRIORITY[a.priority || 'mid'].order - PRIORITY[b.priority || 'mid'].order);
  const doneToday = db.tasks.filter((x) => x.status === 'done' && x.due === t).length;
  const key = monthKey(t);
  const m = monthTotals(db.tx, key);
  const alerts = limitAlerts(db.tx, db.settings.limits, key);
  const reading = db.books.filter((b) => b.status === 'reading');
  const quote = db.quotes.length ? db.quotes[hashStr(t) % db.quotes.length] : null;
  const qBook = quote && db.books.find((b) => b.id === quote.bookId);
  const idea = db.ideas.find((i) => i.status !== 'planned') || db.ideas[0];
  const shopLeft = db.shop.filter((s) => !s.bought).length;
  const debt = debtTotals(db.debts);
  const activePlans = db.plans.filter((p) => !p.deadline || p.deadline >= t).slice(0, 2);

  return (
    <div className="page home">
      <header className="top">
        <div>
          <div className="eyebrow">{fmtLongDate()}</div>
          <h1>{greeting()}</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.push('search')} aria-label="Qidirish"><Icon name="search" /></button>
          <button className="icon-btn" onClick={() => app.push('settings')} aria-label="Sozlamalar"><Icon name="settings" /></button>
        </div>
      </header>

      {DEMO && (
        <div className="demo-note">
          <b>Namuna rejimi.</b> Hozir misol yozuvlar ko'rsatilmoqda va ular faqat shu qurilmada saqlanadi. Firebase ulangandan keyin o'z hisobingiz bilan kirasiz.
        </div>
      )}

      <div className="home-grid">
        <section className="card today-card" style={{ '--sc': 'var(--c-tasks)' }}>
          <div className="card-head">
            <span className="card-ic"><Icon name="tasks" size={18} /></span>
            <h2>Bugun</h2>
            <span className="card-meta">{doneToday > 0 && `${doneToday} ta bajarildi`}</span>
            <button className="link" onClick={() => app.go('tasks')}>Hammasi</button>
          </div>
          {due.length === 0 ? (
            <div className="calm">Bugunga ochiq vazifa qolmadi.</div>
          ) : (
            <ul className="mini-tasks">
              {due.slice(0, 6).map((x) => (
                <li key={x.id} onClick={() => app.openSheet('task', { id: x.id })}>
                  <Check state={x.status} color="var(--c-tasks)" onClick={() => db.update('tasks', x.id, { status: 'done' })} label="Bajarildi deb belgilash" />
                  <span className="mt-title">{x.title}</span>
                  {x.due < t ? <span className="pill danger">{fmtDate(x.due)}</span> : x.time ? <span className="mt-time">{x.time}</span> : null}
                  {x.priority === 'high' && <span className="prio-dot" title="Muhim" />}
                </li>
              ))}
              {due.length > 6 && <li className="more" onClick={() => app.go('tasks')}>yana {due.length - 6} ta</li>}
            </ul>
          )}
        </section>

        <section className="card money-card" style={{ '--sc': 'var(--c-money)' }} onClick={() => app.go('money')}>
          <div className="card-head">
            <span className="card-ic"><Icon name="wallet" size={18} /></span>
            <h2>{monthLabel(key)}</h2>
          </div>
          <div className="balance">
            <span className="b-label">Qoldiq</span>
            <span className={'b-num' + (m.balance < 0 ? ' neg' : '')}>{money(m.balance)}<small> so'm</small></span>
          </div>
          <div className="io">
            <div><span className="io-l"><Icon name="up" size={14} /> Kirim</span><b>{money(m.income)}</b></div>
            <div><span className="io-l"><Icon name="down" size={14} /> Chiqim</span><b>{money(m.expense)}</b></div>
          </div>
          {alerts.slice(0, 2).map((a) => (
            <div key={a.cat} className={'alert ' + a.level}>
              <span>{a.cat}</span>
              <span>{a.level === 'over' ? 'limit oshdi' : `limitning ${Math.round(a.ratio * 100)}%`}</span>
            </div>
          ))}
          {(debt.lent > 0 || debt.borrowed > 0) && (
            <button className="debt-chip" onClick={(e) => { e.stopPropagation(); app.go('money', 'debts'); }}>
              <Icon name="swap" size={16} />
              <span>Qarzlar</span>
              {debt.lent > 0 && <span className="in">+{money(debt.lent)}</span>}
              {debt.borrowed > 0 && <span>−{money(debt.borrowed)}</span>}
            </button>
          )}
          {shopLeft > 0 && (
            <button className="shop-chip" onClick={(e) => { e.stopPropagation(); app.go('money', 'shop'); }}>
              <Icon name="cart" size={16} /> Bozorlik ro'yxatida {shopLeft} ta mahsulot
            </button>
          )}
        </section>

        <section className="card book-card" style={{ '--sc': 'var(--c-books)' }}>
          <div className="card-head">
            <span className="card-ic"><Icon name="book" size={18} /></span>
            <h2>O'qilmoqda</h2>
            <button className="link" onClick={() => app.go('books')}>Kitoblar</button>
          </div>
          {reading.length === 0 ? (
            <div className="calm">Hozir o'qilayotgan kitob yo'q. <button className="link inline" onClick={() => app.openSheet('book', { preset: { status: 'reading' } })}>Kitob qo'shish</button></div>
          ) : (
            reading.slice(0, 2).map((b) => (
              <button key={b.id} className="reading" onClick={() => app.push('book', { id: b.id })}>
                <div className="r-title">{b.title}</div>
                <div className="r-author">{b.author}</div>
                <Progress value={b.pages ? (b.page || 0) / b.pages : 0} color="var(--c-books)" />
                <div className="r-pages">{b.page || 0} / {b.pages || '?'} bet{b.pages ? ` · ${Math.round(((b.page || 0) / b.pages) * 100)}%` : ''}</div>
              </button>
            ))
          )}
        </section>

        {quote && (
          <section className="card quote-card" onClick={() => app.openSheet('quote', { id: quote.id })}>
            <Icon name="quote" size={26} className="q-mark" />
            <blockquote>{quote.text}</blockquote>
            <div className="q-src">{qBook ? `${qBook.title}${qBook.author ? ', ' + qBook.author : ''}` : ''}{quote.page ? `, ${quote.page}-bet` : ''}</div>
          </section>
        )}

        <section className="card thoughts-card" style={{ '--sc': 'var(--c-thoughts)' }}>
          <div className="card-head">
            <span className="card-ic"><Icon name="target" size={18} /></span>
            <h2>Rejalar</h2>
            <button className="link" onClick={() => app.go('thoughts', 'plans')}>Hammasi</button>
          </div>
          {activePlans.length === 0 && <div className="calm">Faol reja yo'q.</div>}
          {activePlans.map((p) => {
            const pr = planProgress(p, db.tasks);
            return (
              <button key={p.id} className="plan-mini" onClick={() => app.push('plan', { id: p.id })}>
                <div className="pm-row"><span>{p.title}</span><b>{Math.round(pr.ratio * 100)}%</b></div>
                <Progress thin value={pr.ratio} color="var(--c-thoughts)" />
              </button>
            );
          })}
          {idea && (
            <button className="idea-mini" onClick={() => app.openSheet('idea', { id: idea.id })}>
              <span className="im-l"><Icon name="bulb" size={15} /> So'nggi g'oya</span>
              <span className="im-t">{idea.title}</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
