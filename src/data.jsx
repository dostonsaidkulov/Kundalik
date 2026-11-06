import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getBackend } from './backend.js';
import { DEFAULT_SETTINGS, newId } from './util.js';
import { syncReminders } from './notify.js';
import { DEFAULT_ACCOUNTS } from './accounts.jsx';

const COLS = ['tasks', 'ideas', 'plans', 'tx', 'shop', 'books', 'quotes', 'debts', 'accounts', 'meta'];
const Ctx = createContext(null);

export function DataProvider({ user, backend, children }) {
  const [state, setState] = useState(() => Object.fromEntries(COLS.map((c) => [c, null])));

  useEffect(() => {
    const unsubs = COLS.map((c) =>
      backend.subscribe(user.uid, c, (list) => setState((s) => ({ ...s, [c]: list }))),
    );
    return () => unsubs.forEach((u) => u && u());
  }, [user.uid, backend]);

  const api = useMemo(() => {
    const put = (col, id, data) => backend.put(user.uid, col, id, data);
    return {
      add(col, data) {
        const id = newId();
        put(col, id, { ...data, createdAt: Date.now() });
        return id;
      },
      update(col, id, patch) {
        put(col, id, { ...patch, updatedAt: Date.now() });
      },
      remove(col, id) {
        backend.del(user.uid, col, id);
      },
      saveSettings(patch) {
        put('meta', 'settings', patch);
      },
    };
  }, [backend, user.uid]);

  const settings = useMemo(() => {
    const s = (state.meta || []).find((x) => x.id === 'settings') || {};
    return { ...DEFAULT_SETTINGS, ...s, limits: { ...(s.limits || {}) }, reading: { ...DEFAULT_SETTINGS.reading, ...(s.reading || {}) } };
  }, [state.meta]);

  const loaded = COLS.every((c) => state[c] !== null);
  const value = useMemo(() => {
    const L = (c) => [...(state[c] || [])];
    return {
      loaded,
      user,
      backend,
      settings,
      tasks: L('tasks'),
      ideas: L('ideas').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      plans: L('plans').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      tx: L('tx').sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)),
      shop: L('shop').sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || (a.pos || 0) - (b.pos || 0)),
      books: L('books').sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)),
      quotes: L('quotes').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      debts: L('debts').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      accounts: L('accounts').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.createdAt || 0) - (b.createdAt || 0)),
      ...api,
    };
  }, [state, api, settings, loaded, user, backend]);

  // Birinchi marta: Naqd pul, Plastik karta, Investitsiya hisoblarini yaratamiz (doimiy id bilan, ikki qurilmada takrorlanmaydi)
  useEffect(() => {
    if (!loaded || settings.accountsInit || (state.accounts || []).length) return;
    DEFAULT_ACCOUNTS.forEach(({ id, ...a }) => backend.put(user.uid, 'accounts', id, { ...a, createdAt: Date.now() }));
    backend.put(user.uid, 'meta', 'settings', { accountsInit: true });
  }, [loaded, settings.accountsInit, state.accounts, backend, user.uid]);

  // Eslatmalarni ma'lumot o'zgargandan keyin qayta rejalashtiramiz.
  const timer = useRef();
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncReminders({ tasks: value.tasks, plans: value.plans, books: value.books, debts: value.debts, settings }).catch((e) => console.warn(e));
    }, 1500);
  }, [loaded, value.tasks, value.plans, value.books, value.debts, settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx);
