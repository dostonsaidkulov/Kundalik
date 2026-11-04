import { createContext, useContext } from 'react';

// Navigatsiya, oynalar va xabarlar uchun umumiy kontekst.
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const SECTION_COLOR = {
  tasks: 'var(--c-tasks)',
  money: 'var(--c-money)',
  books: 'var(--c-books)',
  thoughts: 'var(--c-thoughts)',
};
