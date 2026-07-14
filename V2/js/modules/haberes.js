// ════════════════════════════════════════════════
//  modules/haberes.js — Liquidación de haberes docentes
// ════════════════════════════════════════════════
import { $, fmt, MESES_LECTIVOS, MESES } from '../core/dom.js';
import { state, KEYS, loadJ, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { VALOR_HORA, DOCENTES, CURSOS_DOCENTES, horasSemanalesDocente } from '../data/lista-docentes.js';
import { registerPage } from '../core/router.js';

// Estructura de haberes por mes: { [mes]: { [docente]: { horas, extras:[{desc,monto}], valorHora } } }
function getHaberesMes(mes) {
  const all = loadJ(KEYS.HAB) || {};
  if (!all[mes]) {
    all[mes] = {};
    DOCENTES.forEach(d => {
      // Estimación: horas semanales × 4 semanas
      all[mes][d] = { horas: horasSemanalesDocente(d) * 4, extras: [], valorHora: VALOR_HORA };
    });
    saveJ(KEYS.HAB, all);
  }
  // Asegurar que todos los docentes existan
  DOCENTES.forEach(d => {
    if (!all[mes][d]) all[mes][d] = { horas: horasSemanalesDocente(d) * 4, extras: [], valorHora: VALOR_HORA };
  });
  return all[mes];
}

function saveHaberesMes(mes, data) {
  const all = loadJ(KEYS.HAB) || {};
  all[mes] = data;
  saveJ(KEYS.HAB, all);
  if (FS) FS.set('haberes', mes, { mes, ...data });
}

export function renderHaberes() {
  const sel = $('habMes');
  if (sel && sel.options.length === 0) {
    sel.innerHTML = MESES_LECTIVOS.map(m => `<option value="${m}">${m} 2026</option>`).join('');
    sel.value = MESES[new Date().getMonth()] || 'Marzo';
  }
  const mes = $('habMes').value;
  const data = getHaberesMes(mes);

  let totalGeneral = 0;
  const cards = DOCENTES.map(doc => {
    const d = data[doc];
    const valorHora = d.valorHora || VALOR_HORA;
    const subtotal = (d.horas || 0) * valorHora;
    const extrasTotal = (d.extras || []).reduce((s, e) => s + (e.monto || 0), 0);
    const total = subtotal + extrasTotal;
    totalGeneral += total;

    // Cursos que dicta este docente
    const cursos = CURSOS_DOCENTES.filter(c => c.docente === doc);
    const cursosStr = cursos.map(c => `${c.nombre.split(' (')[0]} (${c.hs}h)`).join(', ');

    const extrasHtml = (d.extras || []).map((e, i) =>
      `<div class="hab-extra-row">
        <span>${e.desc || 'Extra'}</span>
        <span style="display:flex;gap:8px;align-items:center">
          <strong>${fmt(e.monto)}</strong>
          <button class="btn-icon danger" onclick="App.haberesQuitarExtra('${mes}','${doc}',${i})" style="padding:3px 8px">✕</button>
        </span>
      </div>`).join('');

    return `<div class="hab-card">
      <div class="hab-head">
        <div class="hab-nombre">${doc}</div>
        <div class="hab-total">${fmt(total)}</div>
      </div>
      <div class="hab-cursos">${cursosStr}</div>
      <div class="hab-row">
        <label style="margin:0">Horas del mes</label>
        <input type="number" class="hab-input" value="${d.horas || 0}" onchange="App.haberesSetHoras('${mes}','${doc}',this.value)">
        <span style="font-size:12px;color:var(--muted)">× ${fmt(valorHora)} = ${fmt(subtotal)}</span>
      </div>
      ${extrasHtml ? `<div class="hab-extras">${extrasHtml}</div>` : ''}
      <div class="hab-add-extra">
        <input type="text" id="hab_ed_${doc.replace(/\s/g,'_')}" placeholder="Concepto extra (ej: reemplazo)">
        <input type="number" id="hab_em_${doc.replace(/\s/g,'_')}" placeholder="$" style="max-width:100px">
        <button class="btn-mini" onclick="App.haberesAgregarExtra('${mes}','${doc}')">+ Extra</button>
      </div>
      <div class="hab-actions">
        <button class="btn-icon" onclick="App.haberesComprobante('${mes}','${doc}')" title="Comprobante PDF">🧾 Comprobante</button>
      </div>
    </div>`;
  }).join('');

  $('habList').innerHTML = cards;
  $('habTotalGeneral').textContent = fmt(totalGeneral);

  // Guardar haberes en rentabilidad (gasto auto)
  syncHaberesToRent(mes, totalGeneral);
}

// Sincronizar el total de haberes con el módulo de rentabilidad
function syncHaberesToRent(mes, total) {
  if (state.rentData[mes]) {
    const hab = state.rentData[mes].find(g => g.key === 'haberes');
    if (hab) { hab.valor = total; saveJ(KEYS.RENT, state.rentData); }
  }
}

export function haberesSetHoras(mes, doc, val) {
  const data = getHaberesMes(mes);
  data[doc].horas = parseFloat(val) || 0;
  saveHaberesMes(mes, data);
  renderHaberes();
}

export function haberesAgregarExtra(mes, doc) {
  const desc = $('hab_ed_' + doc.replace(/\s/g, '_')).value.trim();
  const monto = parseFloat($('hab_em_' + doc.replace(/\s/g, '_')).value) || 0;
  if (!desc || !monto) { alert('Completá concepto y monto del extra'); return; }
  const data = getHaberesMes(mes);
  if (!data[doc].extras) data[doc].extras = [];
  data[doc].extras.push({ desc, monto });
  saveHaberesMes(mes, data);
  logA('HABERES', `Extra a ${doc}: ${desc} ${fmt(monto)}`);
  renderHaberes();
}

export function haberesQuitarExtra(mes, doc, idx) {
  const data = getHaberesMes(mes);
  data[doc].extras.splice(idx, 1);
  saveHaberesMes(mes, data);
  renderHaberes();
}

// Comprobante PDF individual
export function haberesComprobante(mes, doc) {
  const data = getHaberesMes(mes);
  const d = data[doc];
  const valorHora = d.valorHora || VALOR_HORA;
  const subtotal = (d.horas || 0) * valorHora;
  const extrasTotal = (d.extras || []).reduce((s, e) => s + (e.monto || 0), 0);
  const total = subtotal + extrasTotal;

  const { jsPDF } = window.jspdf;
  const docu = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const W = 148;

  docu.setFillColor(15, 31, 61); docu.rect(0, 0, W, 28, 'F');
  docu.setFont('helvetica', 'bold'); docu.setFontSize(16); docu.setTextColor(255, 255, 255);
  docu.text("LET'S", 12, 14);
  docu.setFontSize(9); docu.setFont('helvetica', 'normal');
  docu.text('Innovation English Institute · Bernal', 12, 20);
  docu.setFontSize(11); docu.setFont('helvetica', 'bold');
  docu.text('COMPROBANTE DE HABERES', 12, 25.5);

  docu.setTextColor(26, 24, 20);
  docu.setFontSize(12); docu.setFont('helvetica', 'bold');
  docu.text(`Docente: ${doc}`, 12, 42);
  docu.setFontSize(10); docu.setFont('helvetica', 'normal');
  docu.text(`Período: ${mes} 2026`, 12, 49);

  let y = 60;
  docu.setDrawColor(200, 200, 200);
  docu.setFontSize(10);
  const row = (label, val, bold) => {
    docu.setFont('helvetica', bold ? 'bold' : 'normal');
    docu.text(label, 12, y);
    docu.text(val, W - 12, y, { align: 'right' });
    docu.line(12, y + 2, W - 12, y + 2);
    y += 9;
  };
  row('Horas trabajadas', `${d.horas || 0} hs`);
  row('Valor por hora', fmt(valorHora));
  row('Subtotal', fmt(subtotal), true);
  (d.extras || []).forEach(e => row(`Extra: ${e.desc}`, fmt(e.monto)));

  y += 4;
  docu.setFillColor(15, 31, 61); docu.roundedRect(12, y, W - 24, 14, 2, 2, 'F');
  docu.setFont('helvetica', 'bold'); docu.setFontSize(13); docu.setTextColor(255, 255, 255);
  docu.text('TOTAL A PAGAR', 16, y + 9);
  docu.text(fmt(total), W - 16, y + 9, { align: 'right' });

  y += 28;
  docu.setTextColor(120, 120, 120); docu.setFontSize(8); docu.setFont('helvetica', 'normal');
  docu.text('_______________________', 12, y);
  docu.text('Firma', 22, y + 5);
  docu.text('_______________________', W - 70, y);
  docu.text('Aclaración', W - 60, y + 5);

  docu.save(`Haberes_${doc.replace(/\s/g, '_')}_${mes}_2026.pdf`);
  logA('HABERES', `Comprobante ${doc} ${mes}`);
}

export function exportHaberesCSV() {
  const mes = $('habMes').value;
  const data = getHaberesMes(mes);
  const rows = [['Docente', 'Horas', 'Valor hora', 'Subtotal', 'Extras', 'Total']];
  DOCENTES.forEach(doc => {
    const d = data[doc];
    const vh = d.valorHora || VALOR_HORA;
    const sub = (d.horas || 0) * vh;
    const ex = (d.extras || []).reduce((s, e) => s + e.monto, 0);
    rows.push([doc, d.horas || 0, vh, sub, ex, sub + ex]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csv);
  a.download = `lets_haberes_${mes}_2026.csv`;
  a.click();
}

registerPage('haberes', renderHaberes);
