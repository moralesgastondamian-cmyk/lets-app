// ════════════════════════════════════════════════
//  app.js — punto de entrada principal
// ════════════════════════════════════════════════
import { $, today } from './core/dom.js';
import { state } from './core/store.js';
import { initUsers, trySession, doLogin, doLogout, hA } from './core/auth.js';
import { buildTabs, showPage, firstPage } from './core/router.js';

// ── Encabezado con fecha ──
function initHeader() {
  const d = new Date();
  const el = $('headerDate');
  if (el) el.textContent = d.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

// ── Arrancar la app después del login ──
function startApp() {
  if (!state.CU) return;
  const CU = state.CU;
  const nombre = CU.n || CU.nombre || 'Usuario';
  const rol    = CU.r || CU.rol || 'cajero';

  $('loginOverlay').style.display = 'none';
  $('UB').style.display = 'flex';
  $('UAV').textContent = (nombre[0] || '?').toUpperCase();
  $('UNM').textContent = nombre;
  $('URM').textContent = rol === 'admin' ? 'Administrador' : rol === 'cajero' ? 'Cajero' : 'Usuario';

  buildTabs();
  showPage(firstPage());
}

// ── Inicialización ──
function boot() {
  initHeader();

  initUsers().then(() => {
    if (trySession()) startApp();
    // si no hay sesión, queda visible el login
  });

  // Botón de login
  $('loginBtn').addEventListener('click', doLogin);
  // Enter en los campos
  $('LU').addEventListener('keydown', e => { if (e.key === 'Enter') $('LP').focus(); });
  $('LP').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // Cuando el login es exitoso
  window.addEventListener('login-ok', startApp);

  // Menú de usuario
  $('UB').addEventListener('click', () => $('UM').classList.toggle('open'));
  $('logoutBtn').addEventListener('click', doLogout);
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
