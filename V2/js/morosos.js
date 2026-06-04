// ════════════════════════════════════════════════
//  modules/morosos.js — Alumnos con cuota pendiente
// ════════════════════════════════════════════════
import { $, fmt, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { getTarifa } from '../data/tarifas.js';
import { registerPage, showPage } from '../core/router.js';

export function renderMorosos() {
  const sel = $('mesMoroso');
  if (sel && sel.options.length === 0) {
    sel.innerHTML = MESES_LECTIVOS.map(m => `<option value="${m}">${m} 2026</option>`).join('');
  }
  const mes = $('mesMoroso').value;

  // Alumnos activos que NO pagaron la cuota de ese mes
  const pagaron = new Set(
    state.pagos.filter(p => p.mes === mes && p.concepto === 'Cuota mensual').map(p => p.alumnoId)
  );
  const morosos = state.ALUMNOS.filter(a => a.estado === 'Activo' && !pagaron.has(a.id))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  $('countMorosos').textContent = `${morosos.length} alumnos`;
  const cont = $('morososList');

  if (!morosos.length) {
    cont.innerHTML = `<div class="alert-ok">✅ Todos los alumnos activos pagaron la cuota de ${mes}</div>`;
    return;
  }

  cont.innerHTML = morosos.map(a => {
    const t = getTarifa(a.curso, mes);
    let cuota = t.transferencia;
    if (a.familiar) cuota = Math.round(cuota * 0.95);
    return `<div class="moroso-card">
      <div>
        <div class="moroso-nombre">${a.apellido}, ${a.nombre}</div>
        <div class="moroso-info">${a.curso}${a.familiar ? ' · 🏷 familiar' : ''}</div>
      </div>
      <div style="text-align:right">
        <div class="moroso-monto">${fmt(cuota)}</div>
        <button class="btn-mini" data-cobrar="${a.id}">💳 Cobrar</button>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('[data-cobrar]').forEach(b => b.addEventListener('click', () => {
    const id = parseInt(b.dataset.cobrar);
    showPage('cobrar');
    setTimeout(() => {
      if (window.App && window.App.selectAlumnoById) window.App.selectAlumnoById(id, 'cuota', mes);
    }, 150);
  }));
}

registerPage('morosos', renderMorosos);
