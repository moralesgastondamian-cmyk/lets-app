// ════════════════════════════════════════════════
//  modules/historial.js — Historial de pagos
// ════════════════════════════════════════════════
import { $, fmt, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { logA, canDelete } from '../core/auth.js';
import { deletePago } from '../core/data.js';
import { registerPage } from '../core/router.js';

export function renderHistorial() {
  // Poblar filtro de mes la primera vez
  const fm = $('filterMes');
  if (fm && fm.options.length <= 1) {
    fm.innerHTML = '<option value="">Todos los meses</option>' +
      MESES_LECTIVOS.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  const q = ($('searchHist').value || '').toLowerCase();
  const fMes = $('filterMes').value;
  const fForma = $('filterForma').value;

  let f = state.pagos.filter(p => {
    const mq = !q || p.alumnoNombre.toLowerCase().includes(q) || (p.curso || '').toLowerCase().includes(q) || (p.concepto || '').toLowerCase().includes(q);
    return mq && (!fMes || p.mes === fMes) && (!fForma || p.forma === fForma);
  }).sort((a, b) => b.timestamp - a.timestamp);

  const total = f.reduce((s, p) => s + p.total, 0);
  const cont = $('histList');

  if (!f.length) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">📭</div>Sin registros</div>';
    $('histTotal').textContent = '';
    return;
  }

  // Vista de tarjetas (mobile-first)
  cont.innerHTML = f.map(p => {
    const esEf = p.forma === 'efectivo';
    const bonifTag = p.bonif && p.bonif.tipo !== 'ninguna'
      ? `<span class="tag-bonif">${p.bonif.tipo === 'beca' ? 'BECA' : p.bonif.tipo === 'porc' ? '-' + p.bonif.val + '%' : '-' + fmt(p.bonif.val)}</span>` : '';
    return `<div class="pago-card ${esEf ? 'ef' : 'tr'}">
      <div class="pago-main">
        <div class="pago-nombre">${p.alumnoNombre}</div>
        <div class="pago-detalle">${p.concepto}${p.mes ? ' · ' + p.mes : ''} ${bonifTag}</div>
        <div class="pago-curso">${p.curso || ''}</div>
      </div>
      <div class="pago-side">
        <span class="forma-pill ${esEf ? 'ef' : 'tr'}">${esEf ? '💵 Efectivo' : '🏦 Transf.'}</span>
        <div class="pago-monto">${fmt(p.total)}</div>
        <div class="pago-fecha">${p.fecha}</div>
      </div>
      <div class="pago-acciones">
        <button class="btn-icon" data-ver="${p.id}" title="Ver detalle">👁</button>
        <button class="btn-icon wa" data-wa="${p.id}" title="Enviar por WhatsApp">📲</button>
        <button class="btn-icon" data-recibo="${p.id}" title="Descargar recibo PDF">🧾</button>
        <button class="btn-icon" data-edit="${p.id}" title="Editar">✏️</button>
        ${canDelete() ? `<button class="btn-icon danger" data-del="${p.id}" title="Eliminar">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');

  $('histTotal').textContent = `${f.length} registros · Total: ${fmt(total)}`;

  // Eventos de eliminar
  cont.querySelectorAll('[data-ver]').forEach(btn => {
    btn.addEventListener('click', () => { if (window.App) window.App.verPago(parseInt(btn.dataset.ver)); });
  });
  cont.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => { if (window.App) window.App.editarPago(parseInt(btn.dataset.edit)); });
  });
  cont.querySelectorAll('[data-wa]').forEach(btn => {
    btn.addEventListener('click', () => { if (window.App) window.App.compartirPagoWhatsApp(parseInt(btn.dataset.wa)); });
  });
  cont.querySelectorAll('[data-recibo]').forEach(btn => {
    btn.addEventListener('click', () => { if (window.App) window.App.descargarReciboPagoPDF(parseInt(btn.dataset.recibo)); });
  });
  cont.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => eliminarPago(parseInt(btn.dataset.del)));
  });
}

function eliminarPago(id) {
  if (!canDelete()) { alert('Sin permiso para eliminar'); return; }
  if (!confirm('¿Eliminar este pago?')) return;
  const p = state.pagos.find(x => x.id === id);
  state.pagos = state.pagos.filter(x => x.id !== id);
  deletePago(id);
  if (p) logA('ADMIN', 'Eliminó pago #' + id, `${p.alumnoNombre} ${fmt(p.total)}`);
  renderHistorial();
}

export function exportCSV() {
  const h = ['ID', 'Fecha', 'Alumno', 'Curso', 'Concepto', 'Mes', 'Forma', 'Total'];
  const rows = state.pagos.map(p => [p.id, p.fecha, p.alumnoNombre, p.curso, p.concepto, p.mes, p.forma, p.total]);
  const csv = [h, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csv);
  a.download = `lets_pagos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

registerPage('historial', renderHistorial);
