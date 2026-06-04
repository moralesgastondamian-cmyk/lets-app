// ════════════════════════════════════════════════
//  modules/talonario.js — Talonario de comprobantes
// ════════════════════════════════════════════════
import { $, fmt, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { logA } from '../core/auth.js';
import { getTarifa } from '../data/tarifas.js';
import { TARIFAS_BASE } from '../data/tarifas.js';
import { LOGO_B64 } from '../data/logo.js';
import { registerPage } from '../core/router.js';

export function renderTalonario() {
  const selMes = $('talMes');
  if (selMes && selMes.options.length === 0) {
    selMes.innerHTML = MESES_LECTIVOS.map(m => `<option value="${m}">${m} 2026</option>`).join('');
  }
  const selCurso = $('talCurso');
  if (selCurso && selCurso.options.length <= 1) {
    selCurso.innerHTML = '<option value="">Todos los cursos</option>' +
      Object.keys(TARIFAS_BASE).map(c => `<option value="${c}">${c}</option>`).join('');
  }

  const mes = $('talMes').value;
  const curso = $('talCurso').value;
  const alumnos = state.ALUMNOS.filter(a => a.estado === 'Activo' && (!curso || a.curso === curso))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  $('talCount').textContent = `${alumnos.length} comprobantes · 4 por hoja A4`;

  // Vista previa de los primeros 4
  $('talPreview').innerHTML = alumnos.slice(0, 4).map(a => {
    const t = getTarifa(a.curso, mes);
    const esFam = a.familiar === 1 || a.familiar === '1';
    const ef = esFam ? Math.round(t.efectivo * 0.95) : t.efectivo;
    const tr = esFam ? Math.round(t.transferencia * 0.95) : t.transferencia;
    return `<div class="tal-prev-row">
      <div><strong>${a.apellido}, ${a.nombre}</strong>${esFam ? ' <span class="tag-bonif">fam -5%</span>' : ''}
      <div style="font-size:11px;color:var(--muted)">${a.curso}</div></div>
      <div style="text-align:right;font-size:12px">
        <span style="color:var(--green-tx);font-weight:600">Ef: ${fmt(ef)}</span> ·
        <span style="color:var(--violet-tx);font-weight:600">Tr: ${fmt(tr)}</span>
      </div>
    </div>`;
  }).join('');
}

export function imprimirTalonario() {
  const mes = $('talMes').value;
  const curso = $('talCurso').value;
  const alumnos = state.ALUMNOS.filter(a => a.estado === 'Activo' && (!curso || a.curso === curso))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  if (!alumnos.length) { alert('No hay alumnos para imprimir'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210, PH = 297;
  const perPage = 4;
  const rowH = Math.floor(PH / perPage);
  const midX = PW / 2;
  const pad = 7;
  const halfW = midX - pad * 2;

  alumnos.forEach((a, idx) => {
    const pos = idx % perPage;
    if (pos === 0 && idx > 0) doc.addPage();
    const y0 = pos * rowH;
    const t = getTarifa(a.curso, mes);
    const esFam = a.familiar === 1 || a.familiar === '1';
    const efF = esFam ? Math.round(t.efectivo * 0.95) : t.efectivo;
    const trF = esFam ? Math.round(t.transferencia * 0.95) : t.transferencia;
    const nombre = `${a.apellido}, ${a.nombre}`;
    const cursoStr = a.curso.length > 34 ? a.curso.substring(0, 34) + '…' : a.curso;

    // Línea de corte horizontal entre filas
    if (pos > 0) {
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3);
      doc.line(4, y0, PW - 4, y0);
      doc.setLineDashPattern([], 0);
    }
    // Línea de troquelado vertical (centro)
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
    doc.line(midX, y0 + 3, midX, y0 + rowH - 3);
    doc.setLineDashPattern([], 0);

    function drawHalf(xOff, isInstituto) {
      let y = y0 + 5;
      const xL = xOff + pad;
      const xR = xOff + halfW + pad;
      try { doc.addImage(LOGO_B64, 'PNG', xL, y, 13, 10); } catch (e) {}
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 31, 61);
      doc.text("LET'S Innovation English Institute", xL + 15, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text('Bernal · WhatsApp 15-4087-1571', xL + 15, y + 9.5);

      const badge = isInstituto ? [15, 31, 61] : [112, 48, 160];
      doc.setFillColor(...badge);
      doc.roundedRect(xR - 24, y + 1, 24, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text(isInstituto ? 'INSTITUTO' : 'ALUMNO', xR - 12, y + 6, { align: 'center' });

      y += 15;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 31, 61);
      doc.text(`Comprobante de pago — ${mes} 2026`, xL, y);
      y += 6;

      const labelW = 26, rh = 7;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
      function dataRow(label, drawVal) {
        doc.setFillColor(240, 242, 246);
        doc.rect(xL, y, labelW, rh, 'F');
        doc.rect(xL, y, halfW, rh, 'S');
        doc.line(xL + labelW, y, xL + labelW, y + rh);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
        doc.text(label, xL + 2, y + 4.8);
        drawVal(xL + labelW + 2.5, y + 4.8);
        y += rh;
      }
      dataRow('Alumno', (x, yy) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0); doc.text(nombre.length > 32 ? nombre.substring(0, 32) + '…' : nombre, x, yy); });
      dataRow('Curso', (x, yy) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40); doc.text(cursoStr, x, yy); });
      dataRow('Forma de pago', (x, yy) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(55, 86, 35);
        doc.text(`Efectivo: ${fmt(efF)}`, x, yy);
        doc.setTextColor(75, 26, 122);
        doc.text(`Transf: ${fmt(trF)}`, x + 42, yy);
      });
      if (esFam) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(45, 154, 107);
        doc.text('* Precios con 5% de descuento familiar aplicado', xL + 2, y + 3.5);
        y += 5;
      }
      dataRow('Monto abonado', (x, yy) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.text('$', x, yy); });
      dataRow('Fecha', (x, yy) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text('______ / ______ / 2026', x, yy); });
      if (isInstituto) {
        dataRow('Cobrado por', (x, yy) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text('________________________________', x, yy); });
      }
    }

    drawHalf(0, false);
    drawHalf(midX, true);
  });

  doc.save(`Talonario_${mes}_2026${curso ? '_' + curso.substring(0, 15) : ''}.pdf`);
  logA('TALONARIO', `Generó talonario ${mes}${curso ? ' (' + curso + ')' : ''}`);
}

registerPage('talonario', renderTalonario);
