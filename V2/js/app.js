// ════════════════════════════════════════════════
//  app.js — punto de entrada principal
// ════════════════════════════════════════════════
export const VERSION = '2.4.0';
export const BUILD = '2026-07-14';

import { $ } from './core/dom.js';
import { state } from './core/store.js';
import { initUsers, trySession, doLogin, doLogout } from './core/auth.js';
import { buildTabs, showPage, firstPage } from './core/router.js';
import { loadLocal, loadFirebase, listenPagos } from './core/data.js';

import * as Pagos from './modules/pagos.js';
import { renderHistorial, exportCSV } from './modules/historial.js';
import * as Alumnos from './modules/alumnos.js';
import { renderMorosos } from './modules/morosos.js';
import { renderDashboard } from './modules/dashboard.js';
import * as Tarifas from './modules/tarifas.js';
import * as Rent from './modules/rentabilidad.js';
import * as Haberes from './modules/haberes.js';
import * as Talonario from './modules/talonario.js';

window.App = {
  buscarAlumno: Pagos.buscarAlumno,
  calcularPrecio: Pagos.calcularPrecio,
  registrarPago: Pagos.registrarPago,
  limpiarForm: Pagos.limpiarForm,
  selectAlumnoById: Pagos.selectAlumnoById,
  descargarUltimoReciboPDF: Pagos.descargarUltimoReciboPDF,
  descargarUltimoReciboJPG: Pagos.descargarUltimoReciboJPG,
  descargarReciboPagoPDF: Pagos.descargarReciboPagoPDF,
  descargarReciboPagoJPG: Pagos.descargarReciboPagoJPG,
  compartirUltimoWhatsApp: Pagos.compartirUltimoWhatsApp,
  compartirPagoWhatsApp: Pagos.compartirPagoWhatsApp,
  renderHistorial,
  exportCSV,
  renderAlumnos: Alumnos.renderAlumnos,
  abrirModalAlumno: Alumnos.abrirModalAlumno,
  guardarAlumno: Alumnos.guardarAlumno,
  toggleBonifVal: Alumnos.toggleBonifVal,
  verFicha: Alumnos.verFicha,
  estadoCuenta: Alumnos.estadoCuenta,
  estadoCuentaDesdeFicha: Alumnos.estadoCuentaDesdeFicha,
  editarDesdeFicha: Alumnos.editarDesdeFicha,
  renderMorosos,
  renderDashboard,
  renderTarifas: Tarifas.renderTarifas,
  setTarifaVista: Tarifas.setTarifaVista,
  guardarTarifasNuevas: Tarifas.guardarTarifasNuevas,
  aplicarAumento: Tarifas.aplicarAumento,
  renderRentabilidad: Rent.renderRentabilidad,
  updateGasto: Rent.updateGasto,
  exportRentCSV: Rent.exportRentCSV,
  renderHaberes: Haberes.renderHaberes,
  haberesSetHoras: Haberes.haberesSetHoras,
  haberesAgregarExtra: Haberes.haberesAgregarExtra,
  haberesQuitarExtra: Haberes.haberesQuitarExtra,
  haberesComprobante: Haberes.haberesComprobante,
  exportHaberesCSV: Haberes.exportHaberesCSV,
  renderTalonario: Talonario.renderTalonario,
  imprimirTalonario: Talonario.imprimirTalonario,
};

function stampVersion() {
  const b = document.querySelector('.v2-banner');
  if (b) b.textContent = `VERSIÓN MODULAR v${VERSION} · build ${BUILD} — EN PRUEBAS`;
}

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
    const name = active.id.replace('page-', '');
    if (['historial','morosos','dashboard','rentabilidad'].includes(name)) showPage(name);
  });
}

function boot() {
  stampVersion();
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
