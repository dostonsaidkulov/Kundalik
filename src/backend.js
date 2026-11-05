import { firebaseConfig } from './config.js';
import { sampleData } from './sample.js';

export const DEMO = !firebaseConfig.apiKey;

let impl = null;
export async function getBackend() {
  if (!impl) impl = DEMO ? localBackend() : await firebaseBackend();
  return impl;
}

const AUTH_ERRORS = {
  'auth/invalid-credential': "Email yoki parol noto'g'ri. Bu ilovada hali hisobingiz bo'lmasa, yuqoridagi «Hisob ochish» ni tanlang.",
  'auth/wrong-password': "Parol noto'g'ri.",
  'auth/user-not-found': 'Bu email bilan hisob topilmadi.',
  'auth/invalid-email': "Email manzili noto'g'ri yozilgan.",
  'auth/email-already-in-use': 'Bu email bilan hisob allaqachon ochilgan. "Kirish" ni tanlang.',
  'auth/weak-password': "Parol kamida 6 ta belgidan iborat bo'lsin.",
  'auth/network-request-failed': "Internet yo'q. Birinchi kirish uchun internet kerak.",
  'auth/too-many-requests': "Juda ko'p urinish bo'ldi. Bir oz kutib, qaytadan urinib ko'ring.",
  'auth/missing-password': 'Parolni kiriting.',
};
export function authErrorText(e) {
  return AUTH_ERRORS[e?.code] || "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
}

async function firebaseBackend() {
  const { initializeApp } = await import('firebase/app');
  const A = await import('firebase/auth');
  const F = await import('firebase/firestore');
  const app = initializeApp(firebaseConfig);
  const auth = A.initializeAuth(app, {
    persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence],
  });
  let db;
  try {
    db = F.initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
    });
  } catch {
    db = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
  return {
    demo: false,
    onUser(cb) {
      return A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
    },
    signIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    signUp: (e, p) => A.createUserWithEmailAndPassword(auth, e, p),
    reset: (e) => A.sendPasswordResetEmail(auth, e),
    signOut: () => A.signOut(auth),
    subscribe(uid, col, cb) {
      return F.onSnapshot(
        F.collection(db, 'users', uid, col),
        { includeMetadataChanges: false },
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (err) => console.error(col, err),
      );
    },
    // Yozuvlar oflayn ham darhol ko'rinadi; server tasdig'ini kutmaymiz.
    put(uid, col, id, data) {
      F.setDoc(F.doc(db, 'users', uid, col, id), data, { merge: true }).catch((e) => console.error(e));
    },
    del(uid, col, id) {
      F.deleteDoc(F.doc(db, 'users', uid, col, id)).catch((e) => console.error(e));
    },
  };
}

function localBackend() {
  const KEY = 'kundalik-demo-v1';
  let state;
  try {
    state = JSON.parse(localStorage.getItem(KEY));
  } catch {
    state = null;
  }
  if (!state) state = sampleData();
  const subs = {};
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* xotira yopiq bo'lsa ham ishlayveradi */
    }
  };
  const emit = (col) => {
    const list = Object.entries(state[col] || {}).map(([id, v]) => ({ ...v, id }));
    (subs[col] || []).forEach((cb) => cb(list));
  };
  return {
    demo: true,
    onUser(cb) {
      cb({ uid: 'demo', email: 'namuna@kundalik' });
      return () => {};
    },
    signIn: async () => {},
    signUp: async () => {},
    reset: async () => {},
    signOut: async () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      location.reload();
    },
    subscribe(_uid, col, cb) {
      (subs[col] ||= []).push(cb);
      setTimeout(() => emit(col), 0);
      return () => {
        subs[col] = subs[col].filter((x) => x !== cb);
      };
    },
    put(_uid, col, id, data) {
      state[col] ||= {};
      const clean = JSON.parse(JSON.stringify(data));
      state[col][id] = { ...(state[col][id] || {}), ...clean };
      save();
      emit(col);
    },
    del(_uid, col, id) {
      if (state[col]) delete state[col][id];
      save();
      emit(col);
    },
  };
}
