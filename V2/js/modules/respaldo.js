// ════════════════════════════════════════════════
//  modules/respaldo.js — exportar e importar datos
// ════════════════════════════════════════════════
import { $, fmt } from '../core/dom.js';
import { state, KEYS, loadJ, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS, showSyncStatus } from '../core/firebase.js';
import { rebuildAlumnos } from '../core/data.js';
import { registerPage } from '../core/router.js';

// ── Vista del módulo ──
export function renderRespaldo() {
  const nPagos = state.pagos.length;
  const nAlumnos = state.ALUMNOS.length;
  const nCustom = (state.alumnosCustom || []).length;
  const totalPagos = state.pagos.reduce((s, p) => s + (p.total || 0), 0);

  $('respResumen').innerHTML = `
    <div class="resp-stat"><span class="resp-num">${nPagos}</span><span class="resp-lbl">pagos registrados</span></div>
    <div class="resp-stat"><span class="resp-num">${nAlumnos}</span><span class="resp-lbl">alumnos (${nCustom} propios)</span></div>
    <div class="resp-stat"><span class="resp-num">${fmt(totalPagos)}</span><span class="resp-lbl">total acumulado</span></div>`;
}

// ── Exportar TODO a un archivo de respaldo ──
export function exportarRespaldo() {
  const respaldo = {
    _formato: 'lets-backup',
    _version: 1,
    _fecha: new Date().toISOString(),
    pagos:         state.pagos || [],
    alumnosCustom: state.alumnosCustom || [],
    tarifasMayo:   state.tarifasMayo || {},
    rentabilidad:  state.rentData || {},
    haberes:       loadJ(KEYS.HAB) || {},
    haberesCfg:    loadJ(KEYS.HAB_CFG) || {},
  };

  const txt = JSON.stringify(respaldo, null, 2);
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(txt);
  a.download = `lets_respaldo_${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  logA('RESPALDO', `Exportó respaldo (${respaldo.pagos.length} pagos)`);
  alert(`✅ Respaldo descargado\n\n${respaldo.pagos.length} pagos\n${respaldo.alumnosCustom.length} alumnos propios\n\nGuardalo en un lugar seguro.`);
}

// ── Exportar solo los pagos a CSV (para Excel) ──
export function exportarPagosCSV() {
  const h = ['ID', 'Fecha', 'Alumno', 'Curso', 'Concepto', 'Mes', 'Forma', 'Base', 'Dto.Familiar', 'Bonificación', 'Total', 'Observaciones'];
  const rows = state.pagos.map(p => [
    p.id, p.fecha, p.alumnoNombre, p.curso, p.concepto, p.mes || '',
    p.forma, p.base || 0, p.descFam || 0, p.descBonif || 0, p.total, p.obs || ''
  ]);
  const csv = [h, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csv);
  a.download = `lets_pagos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  logA('RESPALDO', 'Exportó pagos a CSV');
}

// ── Importar un respaldo ──
export function importarRespaldo() {
  const input = $('respArchivo');
  if (!input.files || !input.files[0]) { alert('Elegí primero el archivo de respaldo'); return; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      alert('❌ El archivo no es un respaldo válido (no se pudo leer).');
      return;
    }
    if (data._formato !== 'lets-backup') {
      alert('❌ Este archivo no es un respaldo de Let\'s App.');
      return;
    }

    const nPagos = (data.pagos || []).length;
    const fecha = data._fecha ? data._fecha.split('T')[0] : 'desconocida';
    const modo = $('respModo').value;

    const aviso = modo === 'reemplazar'
      ? `⚠️ ATENCIÓN: vas a REEMPLAZAR todos los datos actuales.\n\nSe perderán los ${state.pagos.length} pagos que hay ahora y quedarán los ${nPagos} del respaldo.\n\n¿Continuar?`
      : `Vas a AGREGAR los datos del respaldo a los actuales.\n\nRespaldo del ${fecha}: ${nPagos} pagos\nActual: ${state.pagos.length} pagos\n\nLos pagos repetidos (mismo N° de recibo) no se duplican.\n\n¿Continuar?`;

    if (!confirm(aviso)) return;

    showSyncStatus('syncing');

    // ── Pagos ──
    if (modo === 'reemplazar') {
      state.pagos = data.pagos || [];
    } else {
      const existentes = new Set(state.pagos.map(p => p.id));
      (data.pagos || []).forEach(p => { if (!existentes.has(p.id)) state.pagos.push(p); });
    }
    state.pagos.sort((a, b) => (a.id || 0) - (b.id || 0));
    state.pagoCounter = state.pagos.length ? Math.max(...state.pagos.map(p => p.id || 0)) + 1 : 1001;
    saveJ(KEYS.PAGOS, state.pagos);

    // ── Alumnos propios ──
    if (data.alumnosCustom && data.alumnosCustom.length) {
      if (modo === 'reemplazar') {
        state.alumnosCustom = data.alumnosCustom;
      } else {
        const ids = new Set(state.alumnosCustom.map(a => a.id));
        data.alumnosCustom.forEach(a => { if (!ids.has(a.id)) state.alumnosCustom.push(a); });
      }
      saveJ(KEYS.ALUMNOS, state.alumnosCustom);
      rebuildAlumnos();
    }

    // ── Configuraciones ──
    if (data.tarifasMayo && Object.keys(data.tarifasMayo).length) {
      state.tarifasMayo = data.tarifasMayo;
      saveJ(KEYS.TARIFAS_MAYO, state.tarifasMayo);
    }
    if (data.rentabilidad) { state.rentData = data.rentabilidad; saveJ(KEYS.RENT, state.rentData); }
    if (data.haberes)      saveJ(KEYS.HAB, data.haberes);
    if (data.haberesCfg)   saveJ(KEYS.HAB_CFG, data.haberesCfg);

    // ── Subir TODO a Firebase (clave: si no, queda solo local) ──
    let subidos = 0;
    if (FS) {
      for (const p of state.pagos) {
        const ok = await FS.set('pagos', String(p.id), p);
        if (ok) subidos++;
      }
      for (const a of (state.alumnosCustom || [])) {
        await FS.set('alumnos_custom', String(a.id), a);
      }
      if (state.tarifasMayo) await FS.set('config', 'tarifas_mayo', state.tarifasMayo);
    }

    showSyncStatus('ok');
    logA('RESPALDO', `Importó respaldo (${nPagos} pagos, modo ${modo})`);
    alert(`✅ Respaldo importado\n\n${state.pagos.length} pagos en total\n${subidos} sincronizados con la nube`);

    input.value = '';
    renderRespaldo();
    if (window.App && window.App.renderHistorial) window.App.renderHistorial();
  };
  reader.readAsText(input.files[0]);
}

// ── Volver a subir todo a Firebase (por si quedó algo solo local) ──
export async function sincronizarTodo() {
  if (!FS) { alert('Sin conexión a la nube'); return; }
  if (!confirm(`Se van a subir a la nube:\n\n${state.pagos.length} pagos\n${(state.alumnosCustom || []).length} alumnos propios\n\n¿Continuar?`)) return;

  showSyncStatus('syncing');
  let ok = 0, err = 0;
  for (const p of state.pagos) {
    const r = await FS.set('pagos', String(p.id), p);
    r ? ok++ : err++;
  }
  for (const a of (state.alumnosCustom || [])) {
    await FS.set('alumnos_custom', String(a.id), a);
  }
  if (state.tarifasMayo) await FS.set('config', 'tarifas_mayo', state.tarifasMayo);

  showSyncStatus(err ? 'error' : 'ok');
  logA('RESPALDO', `Sincronizó todo (${ok} pagos)`);
  alert(err ? `⚠️ Se subieron ${ok}, fallaron ${err}. Revisá la conexión.` : `✅ Todo sincronizado (${ok} pagos)`);
}

registerPage('respaldo', renderRespaldo);
