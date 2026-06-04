// ════════════════════════════════════════════════
//  modules/pagos.js — Registrar Pago
// ════════════════════════════════════════════════
import { $, fmt, today, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { logA } from '../core/auth.js';
import { savePago } from '../core/data.js';
import { getTarifa, usaTarifaNueva } from '../data/tarifas.js';
import { registerPage } from '../core/router.js';

let selectedAlumno = null;

// ── Bonificaciones ──
function getBonif(alumno) {
  const override = $('overrideBonif') && $('overrideBonif').checked;
  let tipo, val, aplica;
  if (override) {
    tipo   = $('ov_bonif_tipo').value;
    val    = parseFloat($('ov_bonif_val').value) || 0;
    aplica = $('ov_bonif_aplica').value;
  } else {
    tipo   = alumno.bonif_tipo || 'ninguna';
    val    = parseFloat(alumno.bonif_val) || 0;
    aplica = alumno.bonif_aplica || 'ambos';
  }
  return { tipo, val, aplica };
}
function bonifApplies(bonif, concepto) {
  return bonif.aplica === 'ambos'
    || (bonif.aplica === 'cuota' && concepto === 'cuota')
    || (bonif.aplica === 'matricula' && concepto === 'matricula');
}
function calcBonif(base, bonif, concepto) {
  if (!bonifApplies(bonif, concepto) || bonif.tipo === 'ninguna') return 0;
  if (bonif.tipo === 'beca')  return base;
  if (bonif.tipo === 'porc')  return Math.round(base * bonif.val / 100);
  if (bonif.tipo === 'monto') return Math.min(bonif.val, base);
  return 0;
}

// ── Render de la página ──
export function renderPagos() {
  // Poblar el select de mes la primera vez
  const mesSel = $('mesPago');
  if (mesSel && mesSel.options.length === 0) {
    mesSel.innerHTML = MESES_LECTIVOS.map(m => `<option value="${m}">${m} 2026</option>`).join('');
  }
  if ($('fechaPago') && !$('fechaPago').value) $('fechaPago').value = today();
}

// ── Búsqueda de alumno ──
export function buscarAlumno() {
  const q = ($('buscarAlumno').value || '').toLowerCase().trim();
  const list = $('alumnosList');
  if (!q) { list.style.display = 'none'; return; }
  const matches = state.ALUMNOS
    .filter(a => a.estado === 'Activo' &&
      (`${a.apellido} ${a.nombre}`.toLowerCase().includes(q) || a.curso.toLowerCase().includes(q)))
    .slice(0, 8);
  if (!matches.length) { list.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:13px">Sin resultados</div>'; list.style.display = 'block'; return; }
  list.innerHTML = matches.map(a =>
    `<div class="al-item" data-id="${a.id}">
      <strong>${a.apellido}, ${a.nombre}</strong>
      <span style="font-size:11px;color:var(--muted);display:block">${a.curso}</span>
    </div>`).join('');
  list.style.display = 'block';
  list.querySelectorAll('.al-item').forEach(it => {
    it.addEventListener('click', () => selectAlumno(parseInt(it.dataset.id)));
  });
}

export function selectAlumno(id) {
  const a = state.ALUMNOS.find(x => x.id === id);
  if (!a) return;
  selectedAlumno = a;
  $('buscarAlumno').value = `${a.apellido}, ${a.nombre}`;
  $('alumnosList').style.display = 'none';
  $('alumnoInfo').style.display = 'block';
  $('alumnoInfo').innerHTML = `<strong>${a.apellido}, ${a.nombre}</strong> · ${a.curso}${a.familiar ? ' · <span style="color:var(--sky)">🏷 Descuento familiar</span>' : ''}`;
  calcularPrecio();
}

// ── Cálculo de precio ──
export function calcularPrecio() {
  const concepto = $('concepto').value;
  const forma = $('formaPago').value;
  const mes = $('mesPago').value;
  $('mesPagoRow').style.display = concepto === 'cuota' ? 'block' : 'none';

  if (!selectedAlumno || !concepto) { $('pricePreview').style.display = 'none'; $('bonifExtraArea').style.display = 'none'; return; }
  const a = selectedAlumno;
  const t = getTarifa(a.curso, concepto === 'cuota' ? mes : 'Mayo');

  let base = concepto === 'matricula' ? t.matricula : (forma === 'efectivo' ? t.efectivo : t.transferencia);
  let label = concepto === 'matricula' ? 'Matrícula 2026' : `Cuota ${mes} 2026`;
  let descFam = 0;
  if (concepto === 'cuota' && a.familiar) descFam = Math.round(base * 0.05);

  const bonif = getBonif(a);
  const descBonif = calcBonif(base - descFam, bonif, concepto);
  const total = Math.max(0, base - descFam - descBonif);

  // Bonif area
  $('bonifExtraArea').style.display = 'block';
  const hasBonif = a.bonif_tipo && a.bonif_tipo !== 'ninguna';
  if (hasBonif) {
    const labels = { beca: 'Beca 100%', porc: `${a.bonif_val}%`, monto: fmt(a.bonif_val) };
    const apl = { ambos: 'cuota y matrícula', cuota: 'solo cuotas', matricula: 'solo matrícula' };
    $('bonifPermanente').innerHTML = `<span style="color:var(--green);font-weight:600">Bonificación guardada: ${labels[a.bonif_tipo]} — ${apl[a.bonif_aplica || 'ambos']}</span>`;
  } else {
    $('bonifPermanente').innerHTML = '<span style="color:var(--muted)">Sin bonificación fija. Podés agregar una para este pago.</span>';
  }
  $('bonifOverrideFields').style.display = $('overrideBonif').checked ? 'block' : 'none';

  $('pricePreview').style.display = 'block';
  $('pp_concepto').textContent = label;
  $('pp_base').textContent = fmt(base);
  $('pp_alumno').textContent = `${a.apellido}, ${a.nombre}`;
  $('pp_curso').textContent = a.curso.length > 28 ? a.curso.substring(0, 28) + '…' : a.curso;
  $('pp_forma').textContent = forma === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia';
  if (descFam > 0) { $('pp_famRow').style.display = 'flex'; $('pp_fam').textContent = '−' + fmt(descFam); } else $('pp_famRow').style.display = 'none';
  if (descBonif > 0) {
    $('pp_bonifRow').style.display = 'flex';
    const bl = bonif.tipo === 'beca' ? 'Beca (100%)' : bonif.tipo === 'porc' ? `Bonificación (${bonif.val}%)` : 'Bonificación';
    $('pp_bonif_label').textContent = bl;
    $('pp_bonif_val').textContent = '−' + fmt(descBonif);
  } else $('pp_bonifRow').style.display = 'none';
  $('pp_total').textContent = fmt(total);
}

// ── Registrar el pago ──
export function registrarPago() {
  if (!selectedAlumno) { alert('Seleccioná un alumno'); return; }
  const concepto = $('concepto').value;
  if (!concepto) { alert('Seleccioná el concepto'); return; }
  const forma = $('formaPago').value;
  const mes = $('mesPago').value;
  const fecha = $('fechaPago').value || today();
  const obs = $('observaciones').value || '';
  const a = selectedAlumno;

  const t = getTarifa(a.curso, concepto === 'cuota' ? mes : 'Mayo');
  let base = concepto === 'matricula' ? t.matricula : (forma === 'efectivo' ? t.efectivo : t.transferencia);
  let descFam = 0;
  if (concepto === 'cuota' && a.familiar) descFam = Math.round(base * 0.05);
  const bonif = getBonif(a);
  const descBonif = calcBonif(base - descFam, bonif, concepto);
  const total = Math.max(0, base - descFam - descBonif);

  const pago = {
    id: state.pagoCounter++,
    alumnoId: a.id,
    alumnoNombre: `${a.apellido}, ${a.nombre}`,
    curso: a.curso,
    concepto: concepto === 'matricula' ? 'Matrícula 2026' : 'Cuota mensual',
    mes: concepto === 'cuota' ? mes : '',
    forma, fecha, base, descFam, descBonif, total, obs,
    bonif: { tipo: bonif.tipo, val: bonif.val, aplica: bonif.aplica },
    timestamp: Date.now()
  };

  state.pagos.push(pago);
  savePago(pago);
  logA('PAGO', `Registró pago: ${pago.alumnoNombre}`, `${pago.concepto} ${fmt(pago.total)} ${pago.forma}`);

  showReciboConfirm(pago);
  limpiarForm();
}

function showReciboConfirm(p) {
  const card = $('reciboCard');
  card.style.display = 'block';
  $('reciboBody').innerHTML = `
    <div class="recibo-ok">✅ Pago registrado</div>
    <div class="recibo-line"><span>Recibo N°</span><strong>${p.id}</strong></div>
    <div class="recibo-line"><span>Alumno</span><strong>${p.alumnoNombre}</strong></div>
    <div class="recibo-line"><span>Concepto</span><strong>${p.concepto}${p.mes ? ' · ' + p.mes : ''}</strong></div>
    <div class="recibo-line"><span>Forma</span><strong>${p.forma === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}</strong></div>
    <div class="recibo-line total"><span>Total</span><strong>${fmt(p.total)}</strong></div>`;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function limpiarForm() {
  selectedAlumno = null;
  $('buscarAlumno').value = '';
  $('alumnoInfo').style.display = 'none';
  $('concepto').value = '';
  $('formaPago').value = 'transferencia';
  $('observaciones').value = '';
  $('pricePreview').style.display = 'none';
  $('bonifExtraArea').style.display = 'none';
  $('mesPagoRow').style.display = 'none';
  if ($('overrideBonif')) $('overrideBonif').checked = false;
}

// Pre-seleccionar alumno + concepto + mes (usado desde Morosos y Estado de cuenta)
export function selectAlumnoById(id, concepto, mes) {
  selectAlumno(id);
  if (concepto) {
    $('concepto').value = concepto;
    if (concepto === 'cuota' && mes) {
      // asegurar que el select de mes esté poblado
      const mesSel = $('mesPago');
      if (mesSel && mesSel.options.length === 0) renderPagos();
      if (mesSel) mesSel.value = mes;
    }
  }
  calcularPrecio();
  const card = document.querySelector('#page-cobrar .card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Registrar la página en el router
registerPage('cobrar', renderPagos);
