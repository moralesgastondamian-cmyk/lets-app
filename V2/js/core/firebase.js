// ════════════════════════════════════════════════
//  core/firebase.js — conexión a Firebase Firestore
// ════════════════════════════════════════════════
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  onSnapshot, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCQMtW7We78GUEVidJDcd-DUU2bWDKChSg",
  authDomain: "lets-instituto-2026.firebaseapp.com",
  projectId: "lets-instituto-2026",
  storageBucket: "lets-instituto-2026.firebasestorage.app",
  messagingSenderId: "803420785931",
  appId: "1:803420785931:web:cfef6a212c1a4c64d5a60e"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Objeto FS: todas las operaciones con Firestore pasan por acá
export const FS = {
  db,
  async set(col, id, data) {
    try { await setDoc(doc(db, col, String(id)), data); return true; }
    catch (e) { console.error('FS.set error', e); return false; }
  },
  async getAll(col) {
    try {
      const snap = await getDocs(collection(db, col));
      return snap.docs.map(d => ({ ...d.data(), _id: d.id }));
    } catch (e) { console.error('FS.getAll error', e); return []; }
  },
  async del(col, id) {
    try { await deleteDoc(doc(db, col, String(id))); return true; }
    catch (e) { console.error('FS.del error', e); return false; }
  },
  listen(col, callback) {
    return onSnapshot(collection(db, col), snap => {
      callback(snap.docs.map(d => ({ ...d.data(), _id: d.id })));
    });
  }
};

// Indicador visual de sincronización
export function showSyncStatus(s) {
  let el = document.getElementById('syncStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncStatus';
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;padding:8px 14px;border-radius:7px;font-weight:600;font-size:12px;z-index:9999;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0';
    document.body.appendChild(el);
  }
  el.style.opacity = '1';
  if (s === 'syncing')   { el.style.background = '#1a3a6b'; el.style.color = '#fff'; el.textContent = '🔄 Sincronizando...'; }
  else if (s === 'ok')   { el.style.background = '#2d9a6b'; el.style.color = '#fff'; el.textContent = '✅ Sincronizado'; setTimeout(() => el.style.opacity = '0', 2000); }
  else                   { el.style.background = '#c0392b'; el.style.color = '#fff'; el.textContent = '⚠️ Sin conexión — guardado local'; setTimeout(() => el.style.opacity = '0', 4000); }
}
