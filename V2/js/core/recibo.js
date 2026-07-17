// ════════════════════════════════════════════════
//  core/recibo.js — comprobante de pago en PDF o JPG
// ════════════════════════════════════════════════
import { fmt } from './dom.js';
import { LOGO_B64 } from '../data/logo.js';
import { state } from './store.js';

// ─────────────────────────────────────────────────
//  PDF (con jsPDF) — para imprimir / archivar
// ─────────────────────────────────────────────────
function construirPDF(p) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a6', orientation: 'portrait' });

  doc.setFillColor(15, 31, 61); doc.rect(0, 0, 105, 148, 'F');
  doc.setFillColor(255, 255, 255); doc.rect(6, 6, 93, 136, 'F');

  try { doc.addImage(LOGO_B64, 'PNG', 12, 10, 14, 11); } catch (e) {}
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 31, 61);
  doc.text("Let's", 52, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 116, 112);
  doc.text('Innovation English Institute · Bernal', 52, 24, { align: 'center' });
  doc.text('Lavalle 154 esq. Rodríguez Peña · WA 15-4087-1571', 52, 28, { align: 'center' });

  doc.setFillColor(240, 236, 227); doc.roundedRect(22, 31, 61, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(120, 116, 112);
  doc.text(`Recibo N° ${p.id}`, 52, 35, { align: 'center' });

  const rows = filas(p);
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

  doc.setFillColor(15, 31, 61); doc.roundedRect(10, y + 2, 83, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL ABONADO', 14, y + 9);
  doc.text(fmt(p.total), 88, y + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 116, 112);
  doc.text('Gracias por tu confianza 🎓', 52, y + 20, { align: 'center' });
  doc.text('Comprobante válido como recibo de pago.', 52, y + 24, { align: 'center' });

  return doc;
}

// ─────────────────────────────────────────────────
//  JPG (con canvas nativo) — para mandar por WhatsApp
// ─────────────────────────────────────────────────
function construirCanvas(p) {
  // Proporción A6 (105 × 148 mm) a alta resolución
  const W = 420, H = 592;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const navy = '#0f1f3d', gold = '#e8a020', muted = '#787470', dark = '#1a1814';

  // Fondo navy + panel blanco
  ctx.fillStyle = navy; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(24, 24, W - 48, H - 48);

  const cx = W / 2;
  // Título
  ctx.textAlign = 'center';
  ctx.fillStyle = navy; ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText("Let's", cx, 92);
  ctx.fillStyle = muted; ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Innovation English Institute · Bernal', cx, 118);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Lavalle 154 esq. Rodríguez Peña · WA 15-4087-1571', cx, 138);

  // Número de recibo (cápsula)
  ctx.fillStyle = '#f0ece3';
  roundRect(ctx, cx - 120, 152, 240, 26, 6); ctx.fill();
  ctx.fillStyle = muted; ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`Recibo N° ${p.id}`, cx, 170);

  // Filas
  const rows = filas(p);
  let y = 210;
  ctx.font = '15px system-ui, sans-serif';
  rows.forEach(([label, val]) => {
    ctx.textAlign = 'left'; ctx.fillStyle = muted;
    ctx.fillText(label, 48, y);
    ctx.textAlign = 'right'; ctx.fillStyle = dark; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(String(val), W - 48, y);
    ctx.strokeStyle = '#dcd8ce'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, y + 8); ctx.lineTo(W - 48, y + 8); ctx.stroke();
    ctx.font = '15px system-ui, sans-serif';
    y += 34;
  });

  // Total
  y += 6;
  ctx.fillStyle = navy; roundRect(ctx, 40, y, W - 80, 46, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('TOTAL ABONADO', 56, y + 29);
  ctx.textAlign = 'right'; ctx.fillText(fmt(p.total), W - 56, y + 29);

  // Pie
  ctx.textAlign = 'center'; ctx.fillStyle = muted; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Gracias por tu confianza 🎓', cx, y + 84);
  ctx.fillText('Comprobante válido como recibo de pago.', cx, y + 104);

  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────
//  Helpers compartidos
// ─────────────────────────────────────────────────
function filas(p) {
  const rows = [
    ['Fecha', p.fecha],
    ['Alumno', p.alumnoNombre],
    ['Curso', p.curso && p.curso.length > 26 ? p.curso.substring(0, 26) + '…' : (p.curso || '')],
    ['Concepto', p.concepto + (p.mes ? ' · ' + p.mes : '')],
    ['Forma de pago', p.forma === 'efectivo' ? 'Efectivo' : 'Transferencia'],
  ];
  if (p.descFam > 0)   rows.push(['Dto. familiar', '−' + fmt(p.descFam)]);
  if (p.descBonif > 0) rows.push(['Bonificación', '−' + fmt(p.descBonif)]);
  return rows;
}

function nombreArchivo(p) {
  const nombre = (p.alumnoNombre || 'alumno').replace(/,/g, '').replace(/ /g, '_');
  return `Recibo_${p.id}_${nombre}`;
}

// ─────────────────────────────────────────────────
//  API pública
// ─────────────────────────────────────────────────
export function descargarReciboPDF(p) {
  if (!p) { alert('No hay pago para generar el recibo'); return; }
  construirPDF(p).save(nombreArchivo(p) + '.pdf');
}

export function descargarReciboJPG(p) {
  if (!p) { alert('No hay pago para generar el recibo'); return; }
  const canvas = construirCanvas(p);
  const url = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(p) + '.jpg';
  a.click();
}

// ── Compartir por WhatsApp: abre el chat del alumno + descarga el JPG ──
export function compartirReciboWhatsApp(p) {
  if (!p) { alert('No hay pago para compartir'); return; }

  // 1) Descargar el JPG para poder adjuntarlo en el chat
  const canvas = construirCanvas(p);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/jpeg', 0.95);
  a.download = nombreArchivo(p) + '.jpg';
  a.click();

  // 2) Buscar el celular del alumno en su ficha
  const alumno = state.ALUMNOS.find(x => x.id === p.alumnoId);
  const cel = alumno ? normalizarCelular(alumno.celular) : '';

  // 3) Texto del comprobante
  const texto =
    `¡Hola! Te paso el comprobante de pago 🧾\n\n` +
    `*${p.alumnoNombre}*\n` +
    `${p.concepto}${p.mes ? ' · ' + p.mes : ''}\n` +
    `Total: ${fmt(p.total)}\n` +
    `Forma: ${p.forma === 'efectivo' ? 'Efectivo' : 'Transferencia'}\n\n` +
    `Let's Innovation English Institute`;

  // 4) Abrir el chat directo del alumno (o el selector si no hay celular)
  const url = cel
    ? `https://wa.me/${cel}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  setTimeout(() => {
    if (!cel) alert('Este alumno no tiene celular cargado en su ficha.\nSe abre WhatsApp para elegir el contacto. La imagen ya se descargó.');
    window.open(url, '_blank');
  }, 400);
}

// Convierte un celular argentino al formato de WhatsApp: 54 9 + número
function normalizarCelular(cel) {
  if (!cel) return '';
  let n = String(cel).replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = n.slice(1);
  if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9'))  n = n.slice(1);
  n = n.replace(/^(\d{2,4})15/, '$1');
  return '549' + n;
}

export function descargarRecibo(p) { descargarReciboPDF(p); }
