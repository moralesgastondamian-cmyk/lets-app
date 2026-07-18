// ════════════════════════════════════════════════
//  modules/editarPago.js — ver y editar un pago
// ════════════════════════════════════════════════
import { $, fmt, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { logA } from '../core/auth.js';
import { savePago } from '../core/data.js';

let editandoId = null;

// ── Ver detalle completo del pago (solo lectura) ──
export function verPago(id) {
  const p = state.pagos.find(x => x.id === id);
  if (!p) return;
  $('vpTitulo').textContent = `Recibo N° ${p.id}`;
  const row = (label, val) => val || val === 0 ? `<div class="vp-row"><span>${label}</span><strong>${val}</strong></div>` : '';
  $('vpContent').innerHTML = `
    ${row('Fecha', p.fecha)}
    ${row('Alumno', p.alumnoNombre)}
    ${row('Curso', p.curso)}
    ${row('Concepto', p.concepto + (p.mes ? ' · ' + p.mes : ''))}
    ${row('Forma de pago', p.forma === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia')}
    ${p.descFam > 0 ? row('Descuento familiar', '−' + fmt(p.descFam)) : ''}
    ${p.descBonif > 0 ? row('Bonificación', '−' + fmt(p.descBonif)) : ''}
    ${row('Total abonado', fmt(p.total))}
    ${p.obs ? row('Observaciones', p.obs) : ''}
    <div class="vp-actions">
      <button class="btn btn-wa btn-sm" onclick="App.compartirPagoWhatsApp(${p.id})">📲 WhatsApp</button>
      <button class="btn btn-gold btn-sm" onclick="App.descargarReciboPagoPDF(${p.id})">📄 PDF</button>
      <button class="btn btn-primary btn-sm" onclick="App.editarPagoDesdeVista(${p.id})">✏️ Editar</button>
    </div>`;
  abrir('modalVerPago');
}

// ── Abrir el modal de edición ──
export function editarPago(id) {
  const p = state.pagos.find(x => x.id === id);
  if (!p) return;
  editandoId = id;
  $('epTitulo').textContent = `Editar recibo N° ${p.id}`;

  // Poblar el select de mes
  const mesSel = $('ep_mes');
  mesSel.innerHTML = '<option value="">(sin mes)</option>' +
    MESES_LECTIVOS.map(m => `<option value="${m}">${m}</option>`).join('');

  $('ep_fecha').value = p.fecha || '';
  $('ep_forma').value = p.forma || 'transferencia';
  $('ep_mes').value = p.mes || '';
  $('ep_total').value = p.total || 0;
  $('ep_obs').value = p.obs || '';

  // El mes solo aplica a cuotas mensuales
  $('ep_mesRow').style.display = p.concepto === 'Cuota mensual' ? 'block' : 'none';

  abrir('modalEditarPago');
}

// ── Guardar los cambios ──
export function guardarEdicionPago() {
  if (editandoId === null) return;
  const p = state.pagos.find(x => x.id === editandoId);
  if (!p) return;

  const nuevoTotal = parseInt($('ep_total').value) || 0;
  const cambios = [];
  if (p.fecha !== $('ep_fecha').value) cambios.push('fecha');
  if (p.forma !== $('ep_forma').value) cambios.push('forma');
  if (p.mes !== $('ep_mes').value && p.concepto === 'Cuota mensual') cambios.push('mes');
  if (p.total !== nuevoTotal) cambios.push('total');

  p.fecha = $('ep_fecha').value || p.fecha;
  p.forma = $('ep_forma').value;
  if (p.concepto === 'Cuota mensual') p.mes = $('ep_mes').value;
  p.total = nuevoTotal;
  p.obs = $('ep_obs').value;
  p.editadoTs = Date.now();

  savePago(p); // guarda en local + Firebase con el mismo id
  logA('PAGO', `Editó recibo #${p.id}`, `${p.alumnoNombre} · cambios: ${cambios.join(', ') || 'observaciones'}`);

  cerrar('modalEditarPago');
  editandoId = null;

  // Refrescar el historial si está visible
  if (window.App && window.App.renderHistorial) window.App.renderHistorial();
}

// ── Salto de ver → editar ──
export function editarPagoDesdeVista(id) {
  cerrar('modalVerPago');
  editarPago(id);
}

// Helpers de modal (con display inline a prueba de fallos)
function abrir(id) { const m = $(id); m.classList.add('active'); m.style.display = 'flex'; }
function cerrar(id) { const m = $(id); m.classList.remove('active'); m.style.display = 'none'; }
export function cerrarModal(id) { cerrar(id); }
