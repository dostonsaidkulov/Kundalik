import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getBackend } from './backend.js';
import { DataProvider, useData } from './data.jsx';
import { AppCtx } from './appctx.js';
import { Icon } from './ui.jsx';
import { SHEETS } from './sheets.jsx';
import { onNotificationTap } from './notify.js';
import Home from './pages/Home.jsx';
import Tasks from './pages/Tasks.jsx';
import Finance from './pages/Finance.jsx';
import Books, { BookDetail } from './pages/Books.jsx';
import Thoughts, { PlanDetail } from './pages/Thoughts.jsx';
import { Search, Settings, Login } from './pages/Other.jsx';
import { AccountDetail } from './accounts.jsx';

const TABS = [
  { k: 'home', l: 'Bosh sahifa', short: 'Bosh', icon: 'home' },
  { k: 'tasks', l: 'Vazifalar', short: 'Vazifalar', icon: 'tasks' },
  { k: 'money', l: 'Moliya', short: 'Moliya', icon: 'wallet' },
  { k: 'books', l: 'Kitoblar', short: 'Kitoblar', icon: 'book' },
  { k: 'thoughts', l: 'Fikrlar', short: 'Fikrlar', icon: 'bulb' },
];
const VIEWS = { book: BookDetail, plan: PlanDetail, search: Search, settings: Settings, account: AccountDetail };

export default function App() {
  const [backend, setBackend] = useState(null);
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    let unsub;
    getBackend().then((b) => {
      setBackend(b);
      unsub = b.onUser(setUser);
    });
    return () => unsub && unsub();
  }, []);
  if (!backend || user === undefined) return <Splash />;
  if (!user) return <Login />;
  return (
    <DataProvider user={user} backend={backend} key={user.uid}>
      <Shell />
    </DataProvider>
  );
}

function Splash() {
  return (
    <div className="splash">
      <div className="logo"><i /><i /><i /><i /></div>
    </div>
  );
}

function Shell() {
  const db = useData();
  const [tab, setTab] = useState('home');
  const [subs, setSubs] = useState({});
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  const mainRef = useRef();

  const api = useMemo(() => ({
    go(k, sub) {
      setTab(k);
      setStack([]);
      setSheet(null);
      if (sub) setSubs((s) => ({ ...s, [k]: sub }));
      mainRef.current?.scrollTo(0, 0);
    },
    push(view, props = {}) {
      setStack((s) => [...s, { view, props }]);
      mainRef.current?.scrollTo(0, 0);
    },
    pop() {
      setStack((s) => s.slice(0, -1));
    },
    openSheet(type, props = {}) {
      setSheet({ type, props, key: Date.now() });
    },
    closeSheet() {
      setSheet(null);
    },
    toast(text, kind = 'ok') {
      clearTimeout(toastTimer.current);
      setToast({ text, kind, key: Date.now() });
      toastTimer.current = setTimeout(() => setToast(null), 3200);
    },
  }), []);

  // Android "orqaga" tugmasi: oyna → sahifa → bosh sahifa → chiqish
  const state = useRef();
  state.current = { sheet, stack, tab };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle;
    import('@capacitor/app').then(({ App: CapApp }) => {
      handle = CapApp.addListener('backButton', () => {
        const s = state.current;
        if (s.sheet) setSheet(null);
        else if (s.stack.length) setStack((x) => x.slice(0, -1));
        else if (s.tab !== 'home') setTab('home');
        else CapApp.exitApp();
      });
    });
    onNotificationTap((go) => go && api.go(go));
    return () => handle && handle.then?.((h) => h.remove());
  }, [api]);

  const setSub = (k) => (v) => setSubs((s) => ({ ...s, [k]: v }));
  const top = stack[stack.length - 1];
  let content;
  if (top) {
    const V = VIEWS[top.view];
    content = <V key={top.view + (top.props.id || '')} {...top.props} />;
  } else if (tab === 'home') content = <Home />;
  else if (tab === 'tasks') content = <Tasks sub={subs.tasks} setSub={setSub('tasks')} day={subs.day} setDay={setSub('day')} />;
  else if (tab === 'money') content = <Finance sub={subs.money} setSub={setSub('money')} />;
  else if (tab === 'books') content = <Books sub={subs.books} setSub={setSub('books')} />;
  else content = <Thoughts sub={subs.thoughts} setSub={setSub('thoughts')} />;

  const S = sheet && SHEETS[sheet.type];
  const fabAction = () => {
    if (top?.view === 'book') return api.openSheet('quote', { preset: { bookId: top.props.id } });
    if (top?.view === 'account') return api.openSheet('tx', { preset: { type: 'expense', acc: top.props.id } });
    if (top?.view === 'plan') return api.openSheet('task', { preset: { planId: top.props.id, due: '' } });
    if (tab === 'tasks') return subs.tasks === 'schedule' ? api.openSheet('lesson', subs.day ? { preset: { days: [subs.day] } } : {}) : api.openSheet('task');
    if (tab === 'money') return subs.money === 'shop' ? api.openSheet('shop') : subs.money === 'debts' ? api.openSheet('debt') : api.openSheet('tx', { preset: { type: 'expense' } });
    if (tab === 'books') return subs.books === 'quotes' ? api.openSheet('quote') : api.openSheet('book');
    if (tab === 'thoughts') return subs.thoughts === 'plans' ? api.openSheet('plan') : api.openSheet('idea');
    return api.openSheet('quick');
  };

  return (
    <AppCtx.Provider value={api}>
      <div className="shell">
        <nav className="nav" aria-label="Bo'limlar">
          <div className="nav-brand">
            <div className="logo sm"><i /><i /><i /><i /></div>
            <span>Kundalik</span>
          </div>
          {TABS.map((t) => (
            <button key={t.k} className={'nav-btn' + (tab === t.k && !top ? ' on' : tab === t.k ? ' half' : '')} onClick={() => api.go(t.k)} aria-current={tab === t.k ? 'page' : undefined} data-tab={t.k}>
              <Icon name={t.icon} size={22} />
              <span className="nl">{t.l}</span>
              <span className="ns">{t.short}</span>
            </button>
          ))}
          <button className="nav-add" onClick={() => api.openSheet('quick')}><Icon name="plus" size={18} /> Qo'shish</button>
        </nav>
        <main className="main" ref={mainRef}>
          {db.loaded ? content : <div className="loading">Yuklanmoqda…</div>}
        </main>
        {top?.view !== 'search' && top?.view !== 'settings' && !(tab === 'money' && subs.money === 'shop' && !top) && (
          <button className="fab" onClick={fabAction} aria-label="Qo'shish"><Icon name="plus" size={26} stroke={2.2} /></button>
        )}
      </div>
      {S && <S key={sheet.key} {...sheet.props} />}
      {toast && <div key={toast.key} className={'toast ' + toast.kind} role="status">{toast.text}</div>}
    </AppCtx.Provider>
  );
}
