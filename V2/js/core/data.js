// ════════════════════════════════════════════════
//  core/data.js — carga y persistencia de datos
// ════════════════════════════════════════════════
import { FS, showSyncStatus } from './firebase.js';
import { KEYS, loadJ, saveJ, state } from './store.js';
import { ALUMNOS_BASE } from '../data/alumnos.js';
import { TARIFAS_BASE } from '../data/tarifas.js';

// Reconstruir la lista completa de alumnos (base + custom)
export function rebuildAlumnos() {
  const custom = state.alumnosCustom || [];
  state.ALUMNOS = [
    ...ALUMNOS_BASE.filter(a => !custom.find(c => c.id === a.id)),
    ...custom
  ];
}

// Cargar todo desde localStorage (rápido, primero)
export function loadLocal() {
  state.pagos         = loadJ(KEYS.PAGOS) || [];
  state.alumnosCustom = loadJ(KEYS.ALUMNOS) || [];
  state.tarifasMayo   = loadJ(KEYS.TARIFAS_MAYO) || JSON.parse(JSON.stringify(TARIFAS_BASE));
  state.rentData      = loadJ(KEYS.RENT) || {};
  state.pagoCounter   = state.pagos.length ? Math.max(...state.pagos.map(p => p.id || 0)) + 1 : 1001;
  rebuildAlumnos();
}

// Cargar todo desde Firebase (autoritativo)
export async function loadFirebase() {
  if (!FS) return;
  showSyncStatus('syncing');
  try {
    const fsPagos = await FS.getAll('pagos');
    if (fsPagos.length) {
      state.pagos = fsPagos.map(p => ({ ...p })).sort((a, b) => (a.id || 0) - (b.id || 0));
      state.pagoCounter = Math.max(...state.pagos.map(p => p.id || 0)) + 1;
      saveJ(KEYS.PAGOS, state.pagos);
    }
    const fsAlumnos = await FS.getAll('alumnos_custom');
    if (fsAlumnos.length) {
      state.alumnosCustom = fsAlumnos;
      saveJ(KEYS.ALUMNOS, state.alumnosCustom);
      rebuildAlumnos();
    }
    const fsConfig = await FS.getAll('config');
    for (const cfg of fsConfig) {
      if (cfg._id === 'tarifas_mayo') { const t = { ...cfg }; delete t._id; state.tarifasMayo = t; saveJ(KEYS.TARIFAS_MAYO, t); }
      if (cfg._id === 'haberes_cfg')  { const c = { ...cfg }; delete c._id; saveJ(KEYS.HAB_CFG, c); }
    }
    const fsRent = await FS.getAll('rentabilidad');
    for (const r of fsRent) {
      if (r.mes && r.data) { state.rentData[r.mes] = r.data; if (r.extra) state.rentData[r.mes + '_extra'] = r.extra; }
    }
    saveJ(KEYS.RENT, state.rentData);
    const fsHab = await FS.getAll('haberes');
    const habAll = loadJ(KEYS.HAB) || {};
    for (const h of fsHab) { if (h.mes) { const { mes, _id, ...rest } = h; habAll[mes] = rest; } }
    saveJ(KEYS.HAB, habAll);
    showSyncStatus('ok');
  } catch (e) {
    console.error('loadFirebase error:', e);
    showSyncStatus('error');
  }
}

// Guardar un pago (local + Firebase)
export function savePago(pago) {
  saveJ(KEYS.PAGOS, state.pagos);
  if (FS) FS.set('pagos', String(pago.id), pago);
}

// Eliminar un pago (local + Firebase)
export function deletePago(id) {
  if (FS) FS.del('pagos', String(id));
}

// Escuchar cambios de pagos en tiempo real
export function listenPagos(onUpdate) {
  if (!FS) return;
  FS.listen('pagos', fsPagos => {
    if (!fsPagos.length) return;
    state.pagos = fsPagos.sort((a, b) => (a.id || 0) - (b.id || 0));
    state.pagoCounter = Math.max(...state.pagos.map(p => p.id || 0)) + 1;
    saveJ(KEYS.PAGOS, state.pagos);
    if (onUpdate) onUpdate();
  });
}
