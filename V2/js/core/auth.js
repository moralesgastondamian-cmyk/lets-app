// ════════════════════════════════════════════════
//  core/auth.js — login, usuarios, sesión, auditoría
// ════════════════════════════════════════════════
import { $, today } from './dom.js';
import { FS } from './firebase.js';
import { KEYS, loadJ, saveJ, state } from './store.js';

// ── Hash de contraseña (sincrónico, sin dependencias) ──
export function hp(p) {
  let a = 0, b = 0x811c9dc5;
  const s = p + 'lets2026' + p.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761) >>> 0;
    b = (b ^ c) * 16777619 >>> 0;
  }
  return a.toString(36) + b.toString(36);
}

// ── Lista de accesos posibles ──
export const ACCESOS = ['dashboard','alumnos','cobrar','historial','morosos','rentabilidad','tarifas','haberes','talonario','auditoria','usuarios','canDelete'];

// ── Usuarios por defecto (primer arranque) ──
function defaultUsers() {
  const accAdmin = ['dashboard','alumnos','cobrar','historial','morosos','rentabilidad','tarifas','haberes','talonario','auditoria','usuarios','canDelete'];
  return [
    { id:'u1', n:'Administrador 1', u:'admin1', h:hp('admin2026'), r:'admin', a:accAdmin, on:1 },
    { id:'u2', n:'Administrador 2', u:'admin2', h:hp('admin2026'), r:'admin', a:accAdmin, on:1 },
    { id:'u3', n:'Cajero', u:'cajero', h:hp('cajero2026'), r:'cajero', a:['dashboard','cobrar','historial','morosos'], on:1 },
  ];
}

// ── Inicializar usuarios (Firebase o localStorage) ──
export async function initUsers() {
  if (FS) {
    try {
      const users = await FS.getAll('usuarios');
      if (users && users.length > 0 && users[0].u) {
        saveJ(KEYS.USERS, users);
        return;
      }
      const defs = defaultUsers();
      for (const u of defs) await FS.set('usuarios', u.id, u);
      saveJ(KEYS.USERS, defs);
      return;
    } catch (e) {
      console.error('initUsers Firebase error:', e);
    }
  }
  // Fallback localStorage
  const existing = loadJ(KEYS.USERS);
  if (existing && existing.length > 0 && existing[0].u) return;
  saveJ(KEYS.USERS, defaultUsers());
}

// ── Login ──
export async function doLogin() {
  const u = ($('LU').value || '').trim().toLowerCase();
  const p = ($('LP').value || '').trim();
  if (!u || !p) { showLE('Completá usuario y contraseña'); return; }

  $('LU').disabled = true; $('LP').disabled = true;
  try {
    let users = [];
    try { users = await FS.getAll('usuarios'); if (users.length) saveJ(KEYS.USERS, users); } catch (e) {}
    if (!users.length) users = loadJ(KEYS.USERS) || [];

    const found = users.find(x => {
      const username = (x.u || x.usuario || '').toLowerCase();
      const hash     = x.h || x.passHash || x.ph || '';
      const active   = x.on !== undefined ? x.on : (x.activo !== undefined ? x.activo : 1);
      return username === u && hash === hp(p) && active === 1;
    });

    if (!found) { showLE('Usuario o contraseña incorrectos'); return; }
    state.CU = found;
    saveJ(KEYS.SESS, { id: found.id, ts: Date.now() });
    logA('LOGIN', 'Inicio de sesión');
    // Disparamos evento para que app.js arranque la sesión
    window.dispatchEvent(new CustomEvent('login-ok'));
  } catch (e) {
    console.error('Login error:', e);
    showLE('Error de conexión — intentá de nuevo');
  } finally {
    $('LU').disabled = false; $('LP').disabled = false;
  }
}

function showLE(msg) {
  const e = $('LE');
  e.textContent = msg; e.style.display = 'block';
  setTimeout(() => e.style.display = 'none', 3000);
}

export function doLogout() {
  logA('LOGIN', 'Cierre de sesión');
  state.CU = null;
  localStorage.removeItem(KEYS.SESS);
  location.reload();
}

// ── Restaurar sesión guardada ──
export function trySession() {
  try {
    const s = loadJ(KEYS.SESS);
    if (!s || Date.now() - s.ts > 8 * 3600 * 1000) { localStorage.removeItem(KEYS.SESS); return false; }
    const u = (loadJ(KEYS.USERS) || []).find(x => {
      const active = x.on !== undefined ? x.on : (x.activo !== undefined ? x.activo : 1);
      return x.id === s.id && active === 1;
    });
    if (!u) return false;
    state.CU = u;
    return true;
  } catch (e) { return false; }
}

// ── Permisos ──
export function hA(page) {
  if (!state.CU) return false;
  const acc = state.CU.a || state.CU.acc || state.CU.accesos || [];
  return acc.includes(page);
}
export function canDelete() {
  if (!state.CU) return false;
  const acc = state.CU.a || state.CU.acc || [];
  return acc.includes('canDelete');
}

// ── Auditoría ──
export function logA(tipo, desc, det) {
  const log = loadJ(KEYS.AUDIT) || [];
  log.unshift({
    ts: new Date().toISOString(),
    u: state.CU ? state.CU.u : ($('LU') ? $('LU').value : '?'),
    n: state.CU ? state.CU.n : '—',
    tipo, desc, det: det || ''
  });
  saveJ(KEYS.AUDIT, log.slice(0, 500));
}
