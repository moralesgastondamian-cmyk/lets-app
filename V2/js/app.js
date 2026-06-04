// ════════════════════════════════════════════════
//  app.js — punto de entrada principal
// ════════════════════════════════════════════════
import { $ } from './core/dom.js';
import { state } from './core/store.js';
import { initUsers, trySession, doLogin, doLogout } from './core/auth.js';
import { buildTabs, showPage, firstPage } from './core/router.js';
import { loadLocal, loadFirebase, listenPagos } from './core/data.js';

import * as Pagos from './modules/pagos.js';
import { renderHistorial, exportCSV } from './modules/historial.js';
import * as Alumnos from './modules/alumnos.js';
import { renderMorosos } from './modules/morosos.js';

window.App = {
  buscarAlumno: Pagos.buscarAlumno,
  calcularPrecio: Pagos.calcularPrecio,
  registrarPago: Pagos.registrarPago,
  limpiarForm: Pagos.limpiarForm,
  selectAlumnoById: Pagos.selectAlumnoById,
  renderHistorial,
  exportCSV,
  renderAlumnos: Alumnos.renderAlumnos,
  abrirModalAlumno: Alumnos.abrirModalAlumno,
  guardarAlumno: Alumnos.guardarAlumno,
  toggleBonifVal: Alumnos.toggleBonifVal,
  renderMorosos,
};

function initHeader() {
  const d = new Date();
  const el = $('headerDate');
  if (el) el.textContent = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function startApp() {
  if (!state.CU) return;
  const CU = state.CU;
  const nombre = CU.n || CU.nombre || 'Usuario';
  const rol = CU.r || CU.rol || 'cajero';

  $('loginOverlay').style.display = 'none';
  $('UB').style.display = 'flex';
  $('UAV').textContent = (nombre[0] || '?').toUpperCase();
  $('UNM').textContent = nombre;
  $('URM').textContent = rol === 'admin' ? 'Administrador' : rol === 'cajero' ? 'Cajero' : 'Usuario';

  loadLocal();
  buildTabs();
  showPage(firstPage());

  loadFirebase().then(() => {
    const active = document.querySelector('.page.active');
    if (active) showPage(active.id.replace('page-', ''));
  });

  listenPagos(() => {
    const active = document.querySelector('.page.active');
    if (!active) return;
    if (active.id === 'page-historial') renderHistorial();
    if (active.id === 'page-morosos') renderMorosos();
  });
}

function boot() {
  initHeader();
  initUsers().then(() => { if (trySession()) startApp(); });

  $('loginBtn').addEventListener('click', doLogin);
  $('LU').addEventListener('keydown', e => { if (e.key === 'Enter') $('LP').focus(); });
  $('LP').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  window.addEventListener('login-ok', startApp);

  $('UB').addEventListener('click', () => $('UM').classList.toggle('open'));
  $('logoutBtn').addEventListener('click', doLogout);

  document.addEventListener('click', e => {
    if (!e.target.closest('#buscarAlumno') && !e.target.closest('#alumnosList')) {
      const list = $('alumnosList'); if (list) list.style.display = 'none';
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
