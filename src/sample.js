import { addDays, dateStr, today, DEFAULT_SETTINGS } from './util.js';

// Namuna rejimi uchun misol yozuvlar (Firebase ulanmaganda ko'rsatiladi).
export function sampleData() {
  const t = today();
  const now = Date.now();
  const m = t.slice(0, 8);
  const d = (n) => {
    const day = Math.min(Math.max(1, Number(t.slice(8)) - n), 28);
    return m + String(day).padStart(2, '0');
  };
  const prev = (() => {
    const x = new Date();
    x.setDate(1);
    x.setMonth(x.getMonth() - 1);
    return dateStr(x).slice(0, 8);
  })();
  const obj = (arr) => Object.fromEntries(arr.map((x, i) => [x.id, { createdAt: now - i * 1000, ...x, id: undefined }]));

  return {
    meta: { settings: { ...DEFAULT_SETTINGS, limits: { 'Oziq-ovqat': 2500000, 'Dam olish': 600000, Transport: 500000 } } },
    plans: obj([
      { id: 'p1', title: 'Ingliz tilini B2 ga chiqarish', goal: "IELTS'dan 6.5 ball", deadline: addDays(t, 75), note: 'Har kuni kamida 40 daqiqa.',
        steps: [
          { id: 's1', text: "Darajani aniqlash testini topshirish", done: true },
          { id: 's2', text: "Kurs tanlash va to'lash", done: true },
          { id: 's3', text: "Speaking klubiga yozilish", taskId: 't3' },
          { id: 's4', text: 'Sinov imtihoni (mock test)', done: false },
        ] },
      { id: 'p2', title: "Uyni ta'mirlash", goal: 'Oshxona va dahliz', deadline: addDays(t, 40), steps: [
        { id: 's5', text: 'Ustalardan narx so\'rash', done: true },
        { id: 's6', text: 'Materiallar ro\'yxati', done: false },
        { id: 's7', text: "Plitka tanlash", done: false },
      ] },
    ]),
    tasks: obj([
      { id: 't1', title: "Kommunal to'lovlarni to'lash", due: t, time: '18:00', priority: 'high', status: 'todo', remind: '1h' },
      { id: 't2', title: 'Hisobotni rahbarga yuborish', due: t, time: '11:00', priority: 'high', status: 'doing', remind: 'at' },
      { id: 't3', title: 'Speaking klubiga yozilish', due: addDays(t, 1), priority: 'mid', status: 'todo', planId: 'p1', remind: 'none' },
      { id: 't4', title: "Onamga qo'ng'iroq qilish", due: t, priority: 'mid', status: 'done' },
      { id: 't5', title: 'Mashinani texnik ko\'rikdan o\'tkazish', due: addDays(t, -1), priority: 'mid', status: 'todo', remind: 'none' },
      { id: 't6', title: 'Plitka do\'konlarini aylanish', due: addDays(t, 4), priority: 'low', status: 'todo', planId: 'p2' },
      { id: 't7', title: "Kutubxonaga kitob qaytarish", priority: 'low', status: 'todo' },
    ]),
    ideas: obj([
      { id: 'i1', title: 'Oilaviy byudjet jadvali', text: "Har oy oxirida oila bilan birga xarajatlarni ko'rib chiqish odatini boshlash.", tags: ['oila', 'pul'], status: 'thinking' },
      { id: 'i2', title: 'Telegram kanal ochish', text: "O'qigan kitoblarim haqida qisqa xulosalar yozib boradigan kanal.", tags: ['kitob', 'loyiha'], status: 'raw' },
      { id: 'i3', title: 'Ingliz tilini jiddiy o\'rganish', text: 'IELTS uchun tayyorgarlik.', tags: ["ta'lim"], status: 'planned', planId: 'p1' },
    ]),
    tx: obj([
      { id: 'x1', acc: 'card', type: 'income', amount: 9500000, cat: 'Maosh', date: d(3), note: 'Oylik' },
      { id: 'x2', acc: 'card', type: 'income', amount: 1200000, cat: "Qo'shimcha daromad", date: d(1), note: 'Tarjima ishi' },
      { id: 'x3', acc: 'card', type: 'expense', amount: 386000, cat: 'Oziq-ovqat', date: d(0), note: 'Korzinka' },
      { id: 'x4', acc: 'cash', type: 'expense', amount: 45000, cat: 'Transport', date: d(0), note: 'Taksi' },
      { id: 'x5', acc: 'card', type: 'expense', amount: 640000, cat: 'Kommunal', date: d(1), note: "Gaz, svet, suv" },
      { id: 'x6', acc: 'cash', type: 'expense', amount: 1150000, cat: 'Oziq-ovqat', date: d(2), note: 'Bozorlik' },
      { id: 'x7', acc: 'card', type: 'expense', amount: 280000, cat: 'Dam olish', date: d(2), note: 'Kino va kafe' },
      { id: 'x8', acc: 'card', type: 'expense', amount: 520000, cat: "Sog'liq", date: d(3), note: 'Dorixona' },
      { id: 'x9', acc: 'cash', type: 'expense', amount: 360000, cat: 'Dam olish', date: d(4), note: "Do'stlar bilan osh" },
      { id: 'x10', acc: 'card', type: 'expense', amount: 900000, cat: "Ta'lim", date: d(4), note: 'Ingliz tili kursi' },
      { id: 'x11', acc: 'card', type: 'income', amount: 9500000, cat: 'Maosh', date: prev + '05', note: 'Oylik' },
      { id: 'x12', acc: 'card', type: 'expense', amount: 2900000, cat: 'Oziq-ovqat', date: prev + '12', note: '' },
      { id: 'x13', acc: 'card', type: 'expense', amount: 1800000, cat: 'Uy', date: prev + '18', note: 'Mebel' },
      { id: 'x15', type: 'transfer', from: 'card', to: 'invest', amount: 2000000, date: d(3), note: 'Har oylik jamg\'arma' },
      { id: 'x16', type: 'transfer', from: 'card', to: 'cash', amount: 500000, date: d(1), note: 'Bankomatdan' },
      { id: 'x17', type: 'adjust', acc: 'invest', amount: 180000, date: d(0), note: 'Aksiyalar narxi oshdi' },
      { id: 'x14', acc: 'card', type: 'expense', amount: 700000, cat: 'Kommunal', date: prev + '20', note: '' },
    ]),
    accounts: {
      cash: { name: 'Naqd pul', type: 'cash', initial: 1850000, order: 0, createdAt: now },
      card: { name: 'Humo karta', type: 'card', initial: 3200000, order: 1, createdAt: now },
      invest: { name: 'Investitsiya', type: 'invest', initial: 5000000, order: 2, createdAt: now },
    },
    debts: obj([
      { id: 'd1', dir: 'lent', person: 'Jasur', amount: 1500000, date: d(4), due: addDays(t, 3), note: 'Telefon uchun', remind: true, payments: [{ id: 'p1', amount: 500000, date: d(1) }], closed: false },
      { id: 'd2', dir: 'borrowed', person: 'Akam', amount: 2000000, date: d(2), due: addDays(t, 20), note: '', remind: true, payments: [], closed: false },
      { id: 'd3', dir: 'lent', person: 'Dilshod', amount: 300000, date: d(4), payments: [{ id: 'p2', amount: 300000, date: d(0) }], closed: true },
    ]),
    shop: obj([
      { id: 'b1', name: 'Non', qty: '2 ta', price: 8000, bought: true },
      { id: 'b2', name: 'Sut', qty: '1 l', price: 14000, bought: true },
      { id: 'b3', name: 'Tuxum', qty: '10 ta', price: 18000, bought: false },
      { id: 'b4', name: 'Kartoshka', qty: '3 kg', price: 21000, bought: false },
      { id: 'b5', name: 'Pomidor', qty: '1 kg', bought: false },
      { id: 'b6', name: 'Choy', qty: '1 quti', bought: false },
    ]),
    books: obj([
      { id: 'k1', title: "O'tkan kunlar", author: 'Abdulla Qodiriy', status: 'reading', pages: 384, page: 212 },
      { id: 'k2', title: 'Atom odatlar', author: 'Jeyms Klir', status: 'done', pages: 320, page: 320, rating: 5, summary: "Kichik odatlar yig'ilib katta natija beradi. Maqsad emas, tizim muhim." },
      { id: 'k3', title: 'Sariq devni minib', author: 'Xudoyberdi To\'xtaboyev', status: 'done', pages: 256, page: 256, rating: 4 },
      { id: 'k4', title: 'Chuqur ish', author: 'Kel Nyuport', status: 'want', pages: 296 },
      { id: 'k5', title: 'Ufq', author: "Said Ahmad", status: 'want', pages: 512 },
    ]),
    quotes: obj([
      { id: 'q1', bookId: 'k2', text: "Siz maqsadlaringiz darajasiga ko'tarilmaysiz, tizimlaringiz darajasiga tushasiz." },
      { id: 'q2', bookId: 'k2', text: "Har bir harakatingiz qanday inson bo'lishni xohlayotganingiz uchun berilgan ovozdir.", note: 'Eng yoqqan fikr' },
      { id: 'q3', bookId: 'k2', text: "Odatlar o'z ustingizda ishlashning murakkab foizidir." },
    ]),
  };
}
