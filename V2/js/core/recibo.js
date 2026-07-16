// ════════════════════════════════════════════════
//  core/recibo.js — genera el comprobante de pago en PDF
// ════════════════════════════════════════════════
import { fmt } from './dom.js';
import { LOGO_B64 } from '../data/logo.js';

// Genera y descarga el recibo de UN pago específico (no del último del array)
export function descargarRecibo(p) {
  if (!p) { alert('No hay pago para generar el recibo'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a6', orientation: 'portrait' });

  // Marco
  doc.setFillColor(15, 31, 61); doc.rect(0, 0, 105, 148, 'F');
  doc.setFillColor(255, 255, 255); doc.rect(6, 6, 93, 136, 'F');

  // Logo + encabezado
  try { doc.addImage(LOGO_B64, 'PNG', 12, 10, 14, 11); } catch (e) {}
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 31, 61);
  doc.text("Let's", 52, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 116, 112);
  doc.text('Innovation English Institute · Bernal', 52, 24, { align: 'center' });
  doc.text('Lavalle 154 esq. Rodríguez Peña · WA 15-4087-1571', 52, 28, { align: 'center' });

  // Número de recibo
  doc.setFillColor(240, 236, 227); doc.roundedRect(22, 31, 61, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(120, 116, 112);
  doc.text(`Recibo N° ${p.id}`, 52, 35, { align: 'center' });

  // Filas de datos
  const rows = [
    ['Fecha', p.fecha],
    ['Alumno', p.alumnoNombre],
    ['Curso', p.curso && p.curso.length > 28 ? p.curso.substring(0, 28) + '…' : (p.curso || '')],
    ['Concepto', p.concepto + (p.mes ? ' · ' + p.mes : '')],
    ['Forma de pago', p.forma === 'efectivo' ? 'Efectivo' : 'Transferencia'],
  ];
  if (p.descFam > 0)   rows.push(['Dto. familiar', '−' + fmt(p.descFam)]);
  if (p.descBonif > 0) rows.push(['Bonificación', '−' + fmt(p.descBonif)]);

  let y = 44;
  doc.setFontSize(7.5);
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 116, 112);
    doc.text(label, 12, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 24, 20);
    doc.text(String(val), 91, y, { align: 'right' });
    doc.setDrawColor(220, 216, 206); doc.line(12, y + 2, 91, y + 2);
    y += 8;
  });

  // Total
  doc.setFillColor(15, 31, 61); doc.roundedRect(10, y + 2, 83, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL ABONADO', 14, y + 9);
  doc.text(fmt(p.total), 88, y + 9, { align: 'right' });

  // Pie
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 116, 112);
  doc.text('Gracias por tu confianza 🎓', 52, y + 20, { align: 'center' });
  doc.text('Comprobante válido como recibo de pago.', 52, y + 24, { align: 'center' });

  const nombre = (p.alumnoNombre || 'alumno').replace(/,/g, '').replace(/ /g, '_');
  doc.save(`Recibo_${p.id}_${nombre}.pdf`);
}

// Compartir (móvil): descarga el PDF; el sistema ofrece compartir desde archivos
export function compartirRecibo(p) {
  descargarRecibo(p);
}
