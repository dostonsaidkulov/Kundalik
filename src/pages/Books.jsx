import { useState, useEffect } from 'react';
import { useData } from '../data.jsx';
import { useApp } from '../appctx.js';
import { Icon, Segmented, Chips, Empty, Progress, Stars } from '../ui.jsx';
import { BOOK_STATUS, hashStr, norm } from '../util.js';

const COVERS = [
  ['#2E4A7D', '#E8EEF9'], ['#7A2E3A', '#F9E8EB'], ['#2D6A4F', '#E6F4EC'], ['#8A5A12', '#FAF0DF'],
  ['#4B3F8C', '#EEEBFA'], ['#1F5F6E', '#E2F2F5'], ['#5C4033', '#F3ECE7'], ['#3E4A59', '#E9EDF2'],
];
export function Cover({ book, size = 'md' }) {
  const [bg, fg] = COVERS[hashStr(book.title || '') % COVERS.length];
  const initials = (book.title || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className={'cover ' + size} style={{ background: bg, color: fg }} aria-hidden="true">
      <span className="cv-i">{initials}</span>
      <span className="cv-a">{(book.author || '').split(' ').slice(-1)[0]}</span>
    </div>
  );
}

export default function Books({ sub, setSub }) {
  const db = useData();
  const app = useApp();
  const tab = sub || 'books';
  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">{db.books.filter((b) => b.status === 'done').length} ta o'qildi · {db.quotes.length} ta iqtibos</div>
          <h1>Kitoblar</h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.push('search')} aria-label="Qidirish"><Icon name="search" /></button>
        </div>
      </header>
      <Segmented options={[{ v: 'books', l: 'Kitoblar' }, { v: 'quotes', l: 'Iqtiboslar', n: db.quotes.length || null }]} value={tab} onChange={setSub} />
      {tab === 'books' ? <BookList /> : <QuoteList />}
    </div>
  );
}

function BookList() {
  const db = useData();
  const app = useApp();
  const counts = Object.fromEntries(Object.keys(BOOK_STATUS).map((k) => [k, db.books.filter((b) => b.status === k).length]));
  const [st, setSt] = useState(counts.reading ? 'reading' : counts.want ? 'want' : 'all');
  const list = db.books.filter((b) => st === 'all' || b.status === st);
  return (
    <>
      <Chips options={[...Object.entries(BOOK_STATUS).map(([v, l]) => ({ v, l: `${l} ${counts[v] || ''}`.trim() })), { v: 'all', l: 'Hammasi' }]} value={st} onChange={setSt} />
      {list.length === 0 ? (
        <Empty icon="book" title={db.books.length ? "Bu ro'yxat bo'sh" : "Kitob javoni bo'sh"} text="O'qimoqchi bo'lgan kitoblaringizni qo'shing. O'qiyotganingizda sahifani belgilab borasiz." action={<button className="btn soft" onClick={() => app.openSheet('book', { preset: { status: st === 'all' ? 'want' : st } })}>Kitob qo'shish</button>} />
      ) : (
        <ul className="books">
          {list.map((b) => {
            const q = db.quotes.filter((x) => x.bookId === b.id).length;
            return (
              <li key={b.id}>
                <button className="book-row" onClick={() => app.push('book', { id: b.id })}>
                  <Cover book={b} />
                  <div className="br-main">
                    <div className="br-title">{b.title}</div>
                    <div className="br-author">{b.author}</div>
                    {b.status === 'reading' && (
                      <>
                        <Progress thin value={b.pages ? (b.page || 0) / b.pages : 0} color="var(--c-books)" />
                        <div className="br-meta">{b.page || 0} / {b.pages || '?'} bet</div>
                      </>
                    )}
                    {b.status === 'done' && b.rating > 0 && <Stars value={b.rating} size={14} />}
                    {b.status === 'want' && b.pages > 0 && <div className="br-meta">{b.pages} bet</div>}
                    {q > 0 && <div className="br-meta"><Icon name="quote" size={13} /> {q} ta iqtibos</div>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button className="add-row" onClick={() => app.openSheet('book', { preset: { status: st === 'all' ? 'want' : st } })}><Icon name="plus" size={18} /> Kitob qo'shish</button>
    </>
  );
}

export function QuoteCard({ q, showBook = true }) {
  const db = useData();
  const app = useApp();
  const b = db.books.find((x) => x.id === q.bookId);
  return (
    <button className="quote" onClick={() => app.openSheet('quote', { id: q.id })}>
      <blockquote>{q.text}</blockquote>
      {q.note && <div className="q-note">{q.note}</div>}
      <div className="q-src">
        {showBook && b ? <span>{b.title}{b.author ? `, ${b.author}` : ''}</span> : <span />}
        {q.page && <span>{q.page}-bet</span>}
      </div>
    </button>
  );
}

function QuoteList() {
  const db = useData();
  const app = useApp();
  const [s, setS] = useState('');
  const [book, setBook] = useState('');
  const books = db.books.filter((b) => db.quotes.some((q) => q.bookId === b.id));
  const list = db.quotes.filter((q) => (!book || q.bookId === book) && (!s || norm(q.text + ' ' + (q.note || '')).includes(norm(s))));
  return (
    <>
      {db.quotes.length > 0 && (
        <div className="filters">
          <div className="search-in">
            <Icon name="search" size={18} />
            <input value={s} onChange={(e) => setS(e.target.value)} placeholder="Iqtiboslardan qidirish" aria-label="Iqtiboslardan qidirish" />
          </div>
          {books.length > 1 && (
            <select value={book} onChange={(e) => setBook(e.target.value)} aria-label="Kitob bo'yicha">
              <option value="">Barcha kitoblar</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          )}
        </div>
      )}
      {list.length === 0 ? (
        <Empty icon="quote" title={db.quotes.length ? 'Hech narsa topilmadi' : "Hali iqtibos yo'q"} text="Kitobda yoqqan jumlani sahifasi bilan yozib qo'ying. Hammasi shu yerda yig'iladi." />
      ) : (
        <div className="quotes">{list.map((q) => <QuoteCard key={q.id} q={q} />)}</div>
      )}
      <button className="add-row" onClick={() => app.openSheet('quote', { preset: book ? { bookId: book } : {} })}><Icon name="plus" size={18} /> Iqtibos qo'shish</button>
    </>
  );
}

export function BookDetail({ id }) {
  const db = useData();
  const app = useApp();
  const b = db.books.find((x) => x.id === id);
  const [page, setPage] = useState(b?.page || 0);
  const [summary, setSummary] = useState(b?.summary || '');
  useEffect(() => { if (b) setPage(b.page || 0); }, [b?.page]);
  if (!b) return <div className="page"><Empty icon="book" title="Kitob topilmadi" /></div>;
  const quotes = db.quotes.filter((q) => q.bookId === id);
  const setStatus = (status) => {
    const patch = { status };
    if (status === 'done' && b.pages) patch.page = b.pages;
    db.update('books', id, patch);
    if (status === 'done') app.toast('Tabriklayman! Kitobga baho bering va xulosa yozing.');
  };
  const savePage = (v) => {
    const n = Math.max(0, Math.min(Number(v) || 0, b.pages || Infinity));
    setPage(n);
    const patch = { page: n };
    if (b.pages && n >= b.pages && b.status !== 'done') {
      patch.status = 'done';
      app.toast("Kitob o'qib bo'lindi!");
    } else if (n > 0 && b.status === 'want') patch.status = 'reading';
    db.update('books', id, patch);
  };
  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" onClick={app.pop} aria-label="Orqaga"><Icon name="back" /></button>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => app.openSheet('book', { id })} aria-label="Tahrirlash"><Icon name="edit" /></button>
        </div>
      </header>
      <div className="book-hero">
        <Cover book={b} size="lg" />
        <div>
          <h1>{b.title}</h1>
          <div className="bh-author">{b.author}</div>
          {b.pages > 0 && <div className="bh-meta">{b.pages} bet</div>}
        </div>
      </div>
      <Segmented options={Object.entries(BOOK_STATUS).map(([v, l]) => ({ v, l }))} value={b.status} onChange={setStatus} />

      {b.status === 'reading' && (
        <section className="card">
          <div className="card-head"><h2>Qayerdaman</h2><span className="card-meta">{b.pages ? Math.round((page / b.pages) * 100) + '%' : ''}</span></div>
          <Progress value={b.pages ? page / b.pages : 0} color="var(--c-books)" />
          <div className="page-ctl">
            <button className="btn soft" onClick={() => savePage(page - 10)}>−10</button>
            <div className="page-in">
              <input inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} onBlur={(e) => savePage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Hozirgi sahifa" />
              <span>/ {b.pages || '?'} bet</span>
            </div>
            <button className="btn soft" onClick={() => savePage(Number(page) + 10)}>+10</button>
          </div>
        </section>
      )}
      {b.status === 'done' && (
        <section className="card">
          <div className="card-head"><h2>Bahoyim</h2></div>
          <Stars value={b.rating || 0} onChange={(v) => db.update('books', id, { rating: v })} size={30} />
        </section>
      )}
      {b.status !== 'want' && (
        <section className="card">
          <div className="card-head"><h2>Xulosa</h2></div>
          <textarea className="summary-in" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} onBlur={() => summary !== (b.summary || '') && db.update('books', id, { summary })} placeholder="Kitobdan nimani o'rgandingiz? Asosiy fikrlar." aria-label="Xulosa" />
        </section>
      )}

      <section className="group">
        <h3 className="group-t">Iqtiboslar <span>{quotes.length}</span></h3>
        {quotes.length === 0 ? <div className="calm pad">Bu kitobdan hali iqtibos yozilmagan.</div> : <div className="quotes">{quotes.map((q) => <QuoteCard key={q.id} q={q} showBook={false} />)}</div>}
      </section>
      <button className="add-row" onClick={() => app.openSheet('quote', { preset: { bookId: id, page: b.status === 'reading' && page ? String(page) : '' } })}><Icon name="plus" size={18} /> Iqtibos qo'shish</button>
    </div>
  );
}
