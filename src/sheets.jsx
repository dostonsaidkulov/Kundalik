import { useState } from 'react';
import { useData } from './data.jsx';
import { useApp } from './appctx.js';
import { Sheet, Field, Segmented, Chips, DeleteButton, MoneyInput, TagInput, Stars, Icon } from './ui.jsx';
import { today, addDays, PRIORITY, TASK_STATUS, IDEA_STATUS, BOOK_STATUS, REMIND, catColor, money, monthKey, newId } from './util.js';
import { limitState, parseShopList } from './finance-logic.js';
import { askPermission, notifyNow, NATIVE } from './notify.js';
import { DebtSheet } from './debts.jsx';
import { LessonSheet } from './schedule.jsx';
import { AccPicker, lastAcc, rememberAcc, AccountSheet, AdjustSheet } from './accounts.jsx';

const opts = (o) => Object.entries(o).map(([v, l]) => ({ v, l: typeof l === 'string' ? l : l.label }));

function useForm(initial) {
  const [f, setF] = useState(initial);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  return [f, set, setF];
}

function Foot({ onSave, label = 'Saqlash', disabled, left }) {
  return (
    <>
      <div className="foot-left">{left}</div>
      <button type="button" className="btn primary" onClick={onSave} disabled={disabled}>
        {label}
      </button>
    </>
  );
}

/* ---------------- Vazifa ---------------- */
export function TaskSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.tasks.find((t) => t.id === id);
  const [f, set] = useForm({
    title: '', note: '', due: today(), time: '', priority: 'mid', status: 'todo', planId: '', remind: 'none',
    ...preset, ...(old || {}),
  });
  const t0 = today();
  const save = async () => {
    if (!f.title.trim()) return;
    const data = { title: f.title.trim(), note: f.note || '', due: f.due || '', time: f.time || '', priority: f.priority, status: f.status, planId: f.planId || '', remind: f.due ? f.remind : 'none' };
    if (old) db.update('tasks', id, data);
    else db.add('tasks', data);
    app.closeSheet();
    app.toast(old ? 'Vazifa saqlandi' : "Vazifa qo'shildi");
    if (data.remind !== 'none' && NATIVE) {
      const p = await askPermission();
      if (p !== 'granted') app.toast("Eslatma uchun bildirishnomalarga ruxsat bering", 'warn');
    }
  };
  return (
    <Sheet title={old ? 'Vazifa' : 'Yangi vazifa'} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.title.trim()} left={old && <DeleteButton onDelete={() => { db.remove('tasks', id); app.closeSheet(); app.toast("Vazifa o'chirildi"); }} />} />}>
      <Field label="Nima qilish kerak" htmlFor="t-title">
        <input id="t-title" value={f.title} onChange={set('title')} placeholder="Masalan: Kommunal to'lovlarni to'lash" onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
      <Field label="Muddat">
        <div className="row wrap">
          <Chips options={[{ v: t0, l: 'Bugun' }, { v: addDays(t0, 1), l: 'Ertaga' }, { v: '', l: 'Muddatsiz' }]} value={f.due} onChange={set('due')} />
          <input type="date" aria-label="Sana" className="date-in" value={f.due} onChange={set('due')} />
          {f.due && <input type="time" aria-label="Vaqt" className="time-in" value={f.time} onChange={set('time')} />}
        </div>
      </Field>
      <div className="grid2">
        <Field label="Muhimligi">
          <Segmented small options={opts(PRIORITY)} value={f.priority} onChange={set('priority')} />
        </Field>
        <Field label="Holati">
          <Segmented small options={opts(TASK_STATUS)} value={f.status} onChange={set('status')} />
        </Field>
      </div>
      {f.due && (
        <Field label="Eslatma" hint={!f.time && f.remind !== 'none' ? 'Vaqt tanlanmasa, eslatma soat 9:00 ga nisbatan keladi.' : null}>
          <Chips options={opts(REMIND)} value={f.remind} onChange={set('remind')} />
        </Field>
      )}
      {db.plans.length > 0 && (
        <Field label="Reja" htmlFor="t-plan">
          <select id="t-plan" value={f.planId} onChange={set('planId')}>
            <option value="">Rejaga bog'lanmagan</option>
            {db.plans.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Izoh" htmlFor="t-note">
        <textarea id="t-note" rows={2} value={f.note} onChange={set('note')} placeholder="Qo'shimcha ma'lumot" />
      </Field>
    </Sheet>
  );
}

/* ---------------- G'oya ---------------- */
export function IdeaSheet({ id }) {
  const db = useData();
  const app = useApp();
  const old = id && db.ideas.find((t) => t.id === id);
  const [f, set] = useForm({ title: '', text: '', tags: [], status: 'raw', ...(old || {}) });
  const data = () => ({ title: f.title.trim(), text: f.text || '', tags: f.tags || [], status: f.status });
  const save = () => {
    if (!f.title.trim() && !f.text.trim()) return;
    const d = data();
    if (!d.title) d.title = d.text.split('\n')[0].slice(0, 60);
    if (old) db.update('ideas', id, d);
    else db.add('ideas', d);
    app.closeSheet();
    app.toast(old ? "G'oya saqlandi" : "G'oya yozib qo'yildi");
  };
  const toPlan = () => {
    const d = data();
    const planId = db.add('plans', { title: d.title || "Yangi reja", goal: '', note: d.text, deadline: '', steps: [], ideaId: id });
    db.update('ideas', id, { ...d, status: 'planned', planId });
    app.closeSheet();
    app.push('plan', { id: planId });
    app.toast("G'oya rejaga aylandi. Endi bosqichlarini qo'shing.");
  };
  const linked = old?.planId && db.plans.find((p) => p.id === old.planId);
  return (
    <Sheet title={old ? "G'oya" : "Yangi g'oya"} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.title.trim() && !f.text.trim()} left={old && <DeleteButton onDelete={() => { db.remove('ideas', id); app.closeSheet(); app.toast("G'oya o'chirildi"); }} />} />}>
      <Field label="Sarlavha" htmlFor="i-title">
        <input id="i-title" value={f.title} onChange={set('title')} placeholder="Qisqacha nomi" />
      </Field>
      <Field label="Fikr" htmlFor="i-text">
        <textarea id="i-text" rows={5} value={f.text} onChange={set('text')} placeholder="Xayolingizga kelganini yozib qo'ying" />
      </Field>
      <Field label="Teglar" htmlFor="i-tags">
        <TagInput id="i-tags" value={f.tags} onChange={set('tags')} />
      </Field>
      <Field label="Holati">
        <Segmented small options={opts(IDEA_STATUS)} value={f.status} onChange={set('status')} />
      </Field>
      {old && (linked ? (
        <button type="button" className="btn soft wide" onClick={() => { app.closeSheet(); app.push('plan', { id: linked.id }); }}>
          <Icon name="target" size={18} /> Rejani ochish: {linked.title}
        </button>
      ) : (
        <button type="button" className="btn soft wide" onClick={toPlan}>
          <Icon name="target" size={18} /> Rejaga aylantirish
        </button>
      ))}
    </Sheet>
  );
}

/* ---------------- Reja ---------------- */
export function PlanSheet({ id }) {
  const db = useData();
  const app = useApp();
  const old = id && db.plans.find((t) => t.id === id);
  const [f, set] = useForm({ title: '', goal: '', deadline: '', note: '', stepsText: '', ...(old || {}) });
  const save = () => {
    if (!f.title.trim()) return;
    const d = { title: f.title.trim(), goal: f.goal || '', deadline: f.deadline || '', note: f.note || '' };
    if (old) {
      db.update('plans', id, d);
      app.closeSheet();
      app.toast('Reja saqlandi');
    } else {
      const steps = (f.stepsText || '').split('\n').map((s) => s.trim()).filter(Boolean).map((text) => ({ id: newId(), text, done: false }));
      const nid = db.add('plans', { ...d, steps });
      app.closeSheet();
      app.push('plan', { id: nid });
      app.toast('Reja tuzildi');
    }
  };
  return (
    <Sheet title={old ? 'Rejani tahrirlash' : 'Yangi reja'} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.title.trim()} left={old && <DeleteButton onDelete={() => {
        db.tasks.filter((t) => t.planId === id).forEach((t) => db.update('tasks', t.id, { planId: '' }));
        db.remove('plans', id); app.closeSheet(); app.pop(); app.toast("Reja o'chirildi");
      }} />} />}>
      <Field label="Reja nomi" htmlFor="p-title">
        <input id="p-title" value={f.title} onChange={set('title')} placeholder="Masalan: Haydovchilik guvohnomasini olish" />
      </Field>
      <Field label="Maqsad" htmlFor="p-goal">
        <input id="p-goal" value={f.goal} onChange={set('goal')} placeholder="Natijada nimaga erishasiz" />
      </Field>
      <Field label="Muddat" htmlFor="p-dl">
        <input id="p-dl" type="date" value={f.deadline} onChange={set('deadline')} />
      </Field>
      {!old && (
        <Field label="Bosqichlar" htmlFor="p-steps" hint="Har qatorga bitta bosqich yozing. Keyin ham qo'shsa bo'ladi.">
          <textarea id="p-steps" rows={4} value={f.stepsText} onChange={set('stepsText')} placeholder={'Avtomaktabga yozilish\nNazariy imtihon\nAmaliy imtihon'} />
        </Field>
      )}
      <Field label="Izoh" htmlFor="p-note">
        <textarea id="p-note" rows={3} value={f.note} onChange={set('note')} />
      </Field>
    </Sheet>
  );
}

/* ---------------- Kirim / chiqim ---------------- */
export function TxSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.tx.find((t) => t.id === id);
  const defAcc = lastAcc(db.accounts);
  const [f, set, setF] = useForm({ type: 'expense', amount: 0, cat: '', date: today(), note: '', acc: defAcc, from: defAcc, to: '', fee: 0, ...preset, ...(old || {}) });
  const isTr = f.type === 'transfer';
  const cats = f.type === 'income' ? db.settings.incomeCats : db.settings.expenseCats;
  const cat = cats.includes(f.cat) ? f.cat : f.cat || cats[0];
  const liveAcc = db.accounts.filter((a) => !a.archived);
  const toAcc = f.to && f.to !== f.from ? f.to : liveAcc.find((a) => a.id !== f.from)?.id || '';
  const accOk = isTr ? f.from && toAcc && f.from !== toAcc : !!f.acc;
  const save = () => {
    if (!f.amount || !accOk) return;
    if (isTr) {
      const d = { type: 'transfer', amount: f.amount, from: f.from, to: toAcc, date: f.date || today(), note: f.note || '' };
      if (old) db.update('tx', id, d);
      else db.add('tx', d);
      if (!old && f.fee > 0) db.add('tx', { type: 'expense', amount: f.fee, cat: 'Komissiya', acc: f.from, date: d.date, note: "O'tkazma komissiyasi" });
      rememberAcc(f.from);
      app.closeSheet();
      app.toast(old ? 'Saqlandi' : "O'tkazma yozildi");
      return;
    }
    const d = { type: f.type, amount: f.amount, cat, acc: f.acc, date: f.date || today(), note: f.note || '' };
    if (old) db.update('tx', id, d);
    else db.add('tx', d);
    rememberAcc(f.acc);
    app.closeSheet();
    if (d.type === 'expense') {
      const others = db.tx.filter((t) => t.id !== id);
      const ls = limitState([...others, d], db.settings.limits, cat, monthKey(d.date));
      if (ls?.level === 'over') {
        const msg = `«${cat}» limiti oshdi: ${money(ls.spent)} / ${money(ls.limit)} so'm`;
        app.toast(msg, 'danger');
        notifyNow('Limit oshib ketdi', msg);
        return;
      }
      if (ls?.level === 'warn') {
        app.toast(`«${cat}» limitining ${Math.round(ls.ratio * 100)}% ishlatildi`, 'warn');
        return;
      }
    }
    app.toast(old ? 'Saqlandi' : d.type === 'income' ? 'Kirim yozildi' : 'Chiqim yozildi');
  };
  const titles = { expense: ['Chiqim', 'Yangi chiqim'], income: ['Kirim', 'Yangi kirim'], transfer: ["O'tkazma", "Yangi o'tkazma"] };
  return (
    <Sheet title={titles[f.type][old ? 0 : 1]} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.amount || !accOk} left={old && <DeleteButton onDelete={() => { db.remove('tx', id); app.closeSheet(); app.toast("O'chirildi"); }} />} />}>
      {!old && (
        <Segmented options={[{ v: 'expense', l: 'Chiqim' }, { v: 'income', l: 'Kirim' }, { v: 'transfer', l: "O'tkazma" }]} value={f.type} onChange={(v) => setF((s) => ({ ...s, type: v, cat: '' }))} />
      )}
      <Field label="Summa" htmlFor="x-amount">
        <MoneyInput id="x-amount" value={f.amount} onChange={set('amount')} autoFocus={!old} />
      </Field>
      {isTr ? (
        <>
          <Field label="Qayerdan">
            <AccPicker value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v, to: s.to === v ? '' : s.to }))} label="Qaysi hisobdan" />
          </Field>
          <Field label="Qayerga">
            <AccPicker value={toAcc} onChange={set('to')} exclude={f.from} label="Qaysi hisobga" />
          </Field>
          {!old && (
            <Field label="Komissiya (ixtiyoriy)" htmlFor="x-fee" hint="Kiritilsa, xarajat sifatida alohida yoziladi.">
              <MoneyInput id="x-fee" value={f.fee} onChange={set('fee')} />
            </Field>
          )}
          <p className="muted small">O'tkazma kirim yoki chiqim hisoblanmaydi: pul bir hisobingizdan boshqasiga o'tadi, xolos.</p>
        </>
      ) : (
        <>
          <Field label="Kategoriya">
            <Chips options={cats} value={cat} onChange={set('cat')} color={(c) => catColor(c, cats)} />
          </Field>
          <Field label={f.type === 'income' ? 'Qaysi hisobga' : 'Qaysi hisobdan'}>
            <AccPicker value={f.acc} onChange={set('acc')} label="Hisob" />
          </Field>
        </>
      )}
      <div className="grid2">
        <Field label="Sana" htmlFor="x-date">
          <input id="x-date" type="date" value={f.date} onChange={set('date')} />
        </Field>
        <Field label="Izoh" htmlFor="x-note">
          <input id="x-note" value={f.note} onChange={set('note')} placeholder={isTr ? 'Masalan: bankomatdan yechdim' : 'Nimaga'} />
        </Field>
      </div>
    </Sheet>
  );
}

/* ---------------- Bozorlik ---------------- */
export function ShopSheet({ id }) {
  const db = useData();
  const app = useApp();
  const old = id && db.shop.find((t) => t.id === id);
  const [f, set] = useForm({ name: '', qty: '', price: 0, ...(old || {}) });
  const save = () => {
    if (!f.name.trim()) return;
    const d = { name: f.name.trim(), qty: f.qty || '', price: f.price || 0 };
    if (old) db.update('shop', id, d);
    else db.add('shop', { ...d, bought: false });
    app.closeSheet();
  };
  return (
    <Sheet title={old ? 'Mahsulot' : "Ro'yxatga qo'shish"} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.name.trim()} left={old && <DeleteButton onDelete={() => { db.remove('shop', id); app.closeSheet(); }} />} />}>
      <Field label="Nomi" htmlFor="s-name">
        <input id="s-name" value={f.name} onChange={set('name')} placeholder="Masalan: Guruch" />
      </Field>
      <div className="grid2">
        <Field label="Miqdori" htmlFor="s-qty">
          <input id="s-qty" value={f.qty} onChange={set('qty')} placeholder="2 kg" />
        </Field>
        <Field label="Narxi (ixtiyoriy)" htmlFor="s-price">
          <MoneyInput id="s-price" value={f.price} onChange={set('price')} />
        </Field>
      </div>
    </Sheet>
  );
}

export function ShopListSheet() {
  const db = useData();
  const app = useApp();
  const [text, setText] = useState('');
  const items = parseShopList(text);
  const save = () => {
    if (!items.length) return;
    items.forEach((it, i) => db.add('shop', { ...it, price: 0, bought: false, pos: i }));
    app.closeSheet();
    app.toast(`${items.length} ta mahsulot qo'shildi`);
  };
  return (
    <Sheet title="Ro'yxatni tashlash" onClose={app.closeSheet} footer={<Foot onSave={save} disabled={!items.length} label={items.length ? `Qo'shish (${items.length})` : "Qo'shish"} />}>
      <p className="muted small">Ro'yxatni Telegram yoki eslatmalardan nusxalab shu yerga qo'ying. Har bir qator alohida mahsulot bo'ladi, raqamlar va belgilar o'zi tozalanadi.</p>
      <Field htmlFor="sl-text">
        <textarea id="sl-text" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Non 2 ta\nSut 1 l\nTuxum 10 ta\nKartoshka 3 kg'} />
      </Field>
      {items.length > 0 && (
        <ol className="sl-preview">
          {items.map((it, i) => (
            <li key={i}><span>{it.name}</span>{it.qty && <em>{it.qty}</em>}</li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}

export function SpendSheet() {
  const db = useData();
  const app = useApp();
  const items = db.shop.filter((s) => s.bought);
  const cats = db.settings.expenseCats;
  const sum = items.reduce((a, s) => a + (s.price || 0), 0);
  const [f, set] = useForm({ amount: sum, cat: cats.includes('Oziq-ovqat') ? 'Oziq-ovqat' : cats[0], date: today(), note: items.map((s) => s.name).join(', '), acc: lastAcc(db.accounts) });
  const save = () => {
    if (!f.amount) return;
    const d = { type: 'expense', amount: f.amount, cat: f.cat, acc: f.acc, date: f.date, note: f.note ? 'Bozorlik: ' + f.note : 'Bozorlik' };
    rememberAcc(f.acc);
    db.add('tx', d);
    items.forEach((s) => db.remove('shop', s.id));
    app.closeSheet();
    const ls = limitState([...db.tx, d], db.settings.limits, f.cat, monthKey(f.date));
    if (ls?.level === 'over') {
      const msg = `«${f.cat}» limiti oshdi: ${money(ls.spent)} / ${money(ls.limit)} so'm`;
      app.toast(msg, 'danger');
      notifyNow('Limit oshib ketdi', msg);
    } else app.toast(`${money(f.amount)} so'm xarajatga yozildi`);
  };
  return (
    <Sheet title="Xarajatga yozish" onClose={app.closeSheet} footer={<Foot onSave={save} disabled={!f.amount} label="Yozish va ro'yxatdan olish" />}>
      <p className="muted small">
        Olingan {items.length} ta mahsulot chiqim sifatida yoziladi va ro'yxatdan olib tashlanadi.
        {sum === 0 && ' Narxlar kiritilmagan, umumiy summani yozing.'}
      </p>
      <Field label="Umumiy summa" htmlFor="sp-amount">
        <MoneyInput id="sp-amount" value={f.amount} onChange={set('amount')} autoFocus={!sum} />
      </Field>
      <Field label="Kategoriya">
        <Chips options={cats} value={f.cat} onChange={set('cat')} color={(c) => catColor(c, cats)} />
      </Field>
      <Field label="Qaysi hisobdan">
        <AccPicker value={f.acc} onChange={set('acc')} label="Hisob" />
      </Field>
      <div className="grid2">
        <Field label="Sana" htmlFor="sp-date">
          <input id="sp-date" type="date" value={f.date} onChange={set('date')} />
        </Field>
        <Field label="Izoh" htmlFor="sp-note">
          <input id="sp-note" value={f.note} onChange={set('note')} />
        </Field>
      </div>
    </Sheet>
  );
}

export function LimitsSheet() {
  const db = useData();
  const app = useApp();
  const [lim, setLim] = useState({ ...db.settings.limits });
  const save = () => {
    const clean = Object.fromEntries(Object.entries(lim).filter(([, v]) => v > 0));
    db.saveSettings({ limits: clean });
    app.closeSheet();
    app.toast('Limitlar saqlandi');
  };
  return (
    <Sheet title="Oylik limitlar" onClose={app.closeSheet} footer={<Foot onSave={save} />}>
      <p className="muted small">Har bir kategoriya uchun oyiga qancha sarflashni rejalashtirasiz. Limitga yaqinlashsangiz yoki oshirsangiz, ilova ogohlantiradi. Kerak bo'lmasa bo'sh qoldiring.</p>
      <div className="limits">
        {db.settings.expenseCats.map((c) => (
          <div className="limit-row" key={c}>
            <span className="dot" style={{ background: catColor(c, db.settings.expenseCats) }} />
            <label htmlFor={'lim-' + c}>{c}</label>
            <MoneyInput id={'lim-' + c} value={lim[c] || 0} onChange={(v) => setLim((s) => ({ ...s, [c]: v }))} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------------- Kitob ---------------- */
export function BookSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.books.find((t) => t.id === id);
  const [f, set] = useForm({ title: '', author: '', status: 'want', pages: '', page: '', rating: 0, ...preset, ...(old || {}) });
  const save = () => {
    if (!f.title.trim()) return;
    const pages = Number(f.pages) || 0;
    let page = Math.min(Number(f.page) || 0, pages || Infinity);
    if (f.status === 'done' && pages) page = pages;
    const d = { title: f.title.trim(), author: f.author || '', status: f.status, pages, page, rating: f.rating || 0 };
    if (old) db.update('books', id, d);
    else db.add('books', d);
    app.closeSheet();
    app.toast(old ? 'Kitob saqlandi' : "Kitob qo'shildi");
  };
  return (
    <Sheet title={old ? 'Kitobni tahrirlash' : 'Yangi kitob'} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.title.trim()} left={old && <DeleteButton onDelete={() => {
        db.quotes.filter((q) => q.bookId === id).forEach((q) => db.remove('quotes', q.id));
        db.remove('books', id); app.closeSheet(); app.pop(); app.toast("Kitob o'chirildi");
      }} />} />}>
      <Field label="Kitob nomi" htmlFor="b-title">
        <input id="b-title" value={f.title} onChange={set('title')} placeholder="Masalan: Kecha va kunduz" />
      </Field>
      <Field label="Muallif" htmlFor="b-author">
        <input id="b-author" value={f.author} onChange={set('author')} placeholder="Masalan: Cho'lpon" />
      </Field>
      <Field label="Holati">
        <Segmented small options={opts(BOOK_STATUS)} value={f.status} onChange={set('status')} />
      </Field>
      <div className="grid2">
        <Field label="Jami sahifa" htmlFor="b-pages">
          <input id="b-pages" inputMode="numeric" value={f.pages} onChange={(e) => set('pages')(e.target.value.replace(/\D/g, ''))} placeholder="320" />
        </Field>
        {f.status === 'reading' && (
          <Field label="Hozirgi sahifa" htmlFor="b-page">
            <input id="b-page" inputMode="numeric" value={f.page} onChange={(e) => set('page')(e.target.value.replace(/\D/g, ''))} placeholder="0" />
          </Field>
        )}
      </div>
      {f.status === 'done' && (
        <Field label="Bahoyingiz">
          <Stars value={f.rating} onChange={set('rating')} size={26} />
        </Field>
      )}
    </Sheet>
  );
}

export function QuoteSheet({ id, preset = {} }) {
  const db = useData();
  const app = useApp();
  const old = id && db.quotes.find((t) => t.id === id);
  const [f, set] = useForm({ bookId: db.books[0]?.id || '', text: '', page: '', note: '', ...preset, ...(old || {}) });
  const save = () => {
    if (!f.text.trim() || !f.bookId) return;
    const d = { bookId: f.bookId, text: f.text.trim(), page: f.page || '', note: f.note || '' };
    if (old) db.update('quotes', id, d);
    else db.add('quotes', d);
    app.closeSheet();
    app.toast(old ? 'Iqtibos saqlandi' : "Iqtibos qo'shildi");
  };
  if (!db.books.length)
    return (
      <Sheet title="Yangi iqtibos" onClose={app.closeSheet}>
        <p className="muted">Iqtibos kitobga bog'lanadi. Avval kitob qo'shing.</p>
        <button className="btn primary wide" onClick={() => app.openSheet('book')}>Kitob qo'shish</button>
      </Sheet>
    );
  return (
    <Sheet title={old ? 'Iqtibos' : 'Yangi iqtibos'} onClose={app.closeSheet}
      footer={<Foot onSave={save} disabled={!f.text.trim() || !f.bookId} left={old && <DeleteButton onDelete={() => { db.remove('quotes', id); app.closeSheet(); app.toast("Iqtibos o'chirildi"); }} />} />}>
      <Field label="Kitob" htmlFor="q-book">
        <select id="q-book" value={f.bookId} onChange={set('bookId')}>
          {db.books.map((b) => (
            <option key={b.id} value={b.id}>{b.title}{b.author ? ` — ${b.author}` : ''}</option>
          ))}
        </select>
      </Field>
      <Field label="Iqtibos matni" htmlFor="q-text">
        <textarea id="q-text" rows={5} value={f.text} onChange={set('text')} placeholder="Kitobdagi so'zlarni aynan yozing" />
      </Field>
      <div className="grid2">
        <Field label="Sahifa" htmlFor="q-page">
          <input id="q-page" inputMode="numeric" value={f.page} onChange={(e) => set('page')(e.target.value.replace(/\D/g, ''))} placeholder="45" />
        </Field>
        <Field label="O'z fikrim" htmlFor="q-note">
          <input id="q-note" value={f.note} onChange={set('note')} placeholder="Nega yoqdi" />
        </Field>
      </div>
    </Sheet>
  );
}

/* ---------------- Tez qo'shish ---------------- */
const QUICK = [
  { k: 'task', l: 'Vazifa', icon: 'tasks', c: 'var(--c-tasks)' },
  { k: 'lesson', l: 'Dars', icon: 'calendar', c: 'var(--c-tasks)' },
  { k: 'expense', l: 'Chiqim', icon: 'down', c: 'var(--c-money)' },
  { k: 'income', l: 'Kirim', icon: 'up', c: 'var(--c-money)' },
  { k: 'shop', l: 'Bozorlik', icon: 'cart', c: 'var(--c-money)' },
  { k: 'transfer', l: "O'tkazma", icon: 'swap', c: 'var(--c-money)' },
  { k: 'debt', l: 'Qarz', icon: 'coins', c: 'var(--c-money)' },
  { k: 'idea', l: "G'oya", icon: 'bulb', c: 'var(--c-thoughts)' },
  { k: 'plan', l: 'Reja', icon: 'target', c: 'var(--c-thoughts)' },
  { k: 'book', l: 'Kitob', icon: 'book', c: 'var(--c-books)' },
  { k: 'quote', l: 'Iqtibos', icon: 'quote', c: 'var(--c-books)' },
];
export function QuickAdd() {
  const app = useApp();
  const pick = (k) => {
    if (k === 'expense' || k === 'income' || k === 'transfer') app.openSheet('tx', { preset: { type: k } });
    else app.openSheet(k);
  };
  return (
    <Sheet title="Nima qo'shamiz?" onClose={app.closeSheet}>
      <div className="quick">
        {QUICK.map((q) => (
          <button key={q.k} type="button" onClick={() => pick(q.k)} style={{ '--q': q.c }}>
            <span className="q-ic"><Icon name={q.icon} size={22} /></span>
            {q.l}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export const SHEETS = { task: TaskSheet, idea: IdeaSheet, plan: PlanSheet, tx: TxSheet, shop: ShopSheet, spend: SpendSheet, shoplist: ShopListSheet, limits: LimitsSheet, book: BookSheet, quote: QuoteSheet, debt: DebtSheet, account: AccountSheet, adjust: AdjustSheet, lesson: LessonSheet, quick: QuickAdd };
