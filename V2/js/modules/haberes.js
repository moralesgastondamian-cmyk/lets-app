// ════════════════════════════════════════════════
//  modules/haberes.js — liquidación de docentes por calendario
//  Base: sistema V1 (clases reales, asistencia por clase, feriados)
//  + editar docentes, resumen mensual, extras, comprobante y WhatsApp
// ════════════════════════════════════════════════
import { $, fmt, MESES, DNMS, fmtFecha } from '../core/dom.js';
import { state, KEYS, loadJ, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { registerPage } from '../core/router.js';
import { LOGO_B64 } from '../data/logo.js';

let mesHabSel = null;

// ── Configuración por defecto (idéntica a la V1) ──
function defHabCfg() {
  return {
    vh: 14000,
    docentes: [
      { n: 'Mile',           cursos: [{ c: 'Kinder (Sala de 5)', ds: [2, 4], h: 1 }] },
      { n: 'Camila Carrara', cursos: [{ c: 'Kids 2 (2do grado)', ds: [2, 4], h: 1 }, { c: '1st Year (adulto principiante)', ds: [2, 4], h: 1 }] },
      { n: 'Inés',           cursos: [{ c: 'Kids 3 (3er grado)', ds: [1, 3], h: 1 }] },
      { n: 'Leti',           cursos: [
        { c: 'Kids 4 (4to grado)', ds: [1, 3], h: 2 },
        { c: 'Teens 1 (adolescente principiante)', ds: [2, 4], h: 1 },
        { c: 'Teens 3 (adolescente pre-intermedio)', ds: [2, 4], h: 2 },
        { c: '3rd Year (adulto pre-intermedio)', ds: [1, 3], h: 1 },
        { c: 'C1 Advanced (Examen Internacional Cambridge)', ds: [5], h: 2 },
      ] },
      { n: 'Pablo',          cursos: [
        { c: 'Teens 4 (adolescente intermedio)', ds: [1, 3], h: 1 },
        { c: '2nd Year (adulto elemental)', ds: [1, 3], h: 1 },
        { c: '4th Year (adulto intermedio)', ds: [1, 3], h: 1 },
      ] },
    ],
  };
}

function getHabCfg() { return loadJ(KEYS.HAB_CFG) || defHabCfg(); }
function saveHabCfg(cfg) { saveJ(KEYS.HAB_CFG, cfg); if (FS) FS.set('config', 'haberes_cfg', cfg); }

function getHabData(mes) {
  const all = loadJ(KEYS.HAB) || {};
  return all[mes] || { clases: {}, nl: [], extras: {} };
}
function saveHabData(mes, data) {
  const all = loadJ(KEYS.HAB) || {};
  all[mes] = data;
  saveJ(KEYS.HAB, all);
  if (FS) FS.set('haberes', mes, all[mes]);
}

// ── Fechas de clase reales del mes según los días de la semana ──
function getClasesDates(mes, ds) {
  const m = MESES.indexOf(mes), y = 2026;
  const dim = new Date(y, m + 1, 0).getDate();
  const dates = [];
  for (let d = 1; d <= dim; d++) {
    const dow = new Date(y, m, d).getDay();
    if (ds.includes(dow)) {
      dates.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return dates;
}

// ── Valores de hora por docente y mes (docente + administración) ──
// Se guardan en data.valores[docN] = { vhDoc, vhAdm, horasAdm }
// Si no hay valor cargado para ese mes, cae al valor global de la config (cfg.vh).
function getValores(docN, data, cfg) {
  const v = (data.valores && data.valores[docN]) || {};
  return {
    vhDoc: v.vhDoc != null ? v.vhDoc : cfg.vh,   // valor hora docente
    vhAdm: v.vhAdm != null ? v.vhAdm : cfg.vh,   // valor hora administración
    horasAdm: v.horasAdm != null ? v.horasAdm : 0, // horas administrativas del mes
  };
}

// ── Cálculo del total de un docente en el mes ──
function calcularDocente(doc, mes, data, cfg) {
  let totalHoras = 0;
  const clasesData = data.clases[doc.n] || {};
  const detalleCursos = [];
  const val = getValores(doc.n, data, cfg);

  doc.cursos.forEach(curso => {
    const dates = getClasesDates(mes, curso.ds).filter(d => !(data.nl || []).includes(d));
    let horasCurso = 0;
    const clases = [];
    dates.forEach(fecha => {
      const key = `${doc.n}|${fecha}|${curso.c}`;
      const cl = clasesData[key] || { presente: true, h: curso.h };
      const h = cl.presente ? cl.h : 0;
      horasCurso += h;
      clases.push({ fecha, key, presente: cl.presente, h: cl.h, hDefault: curso.h });
    });
    totalHoras += horasCurso;
    detalleCursos.push({ curso: curso.c, ds: curso.ds, horasCurso, clases });
  });

  // Horas de clase × valor docente
  const montoHoras = totalHoras * val.vhDoc;
  // Horas administrativas × valor administración
  const montoAdm = val.horasAdm * val.vhAdm;
  // Extras (bonos, descuentos)
  const extras = (data.extras && data.extras[doc.n]) || [];
  const totalExtras = extras.reduce((s, e) => s + (e.monto || 0), 0);

  return {
    totalHoras, montoHoras,
    horasAdm: val.horasAdm, montoAdm, vhDoc: val.vhDoc, vhAdm: val.vhAdm,
    extras, totalExtras,
    total: montoHoras + montoAdm + totalExtras,
    detalleCursos
  };
}

// ════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════
export function seleccionarMesHab(mes) { mesHabSel = mes; renderHaberes(); }

export function renderHaberes() {
  if (!mesHabSel) mesHabSel = MESES[new Date().getMonth()] || 'Marzo';
  const mes = mesHabSel;
  const cfg = getHabCfg();
  const data = getHabData(mes);

  const btns = $('habMesesBtns');
  if (btns) {
    const ML = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    btns.innerHTML = ML.map(m =>
      `<button class="mes-btn ${m === mes ? 'active' : ''}" onclick="App.seleccionarMesHab('${m}')">${m.slice(0, 3)}</button>`
    ).join('');
  }

  const nl = data.nl || [];
  $('habNoLab').innerHTML = nl.length
    ? nl.sort().map(d => `<span class="nolab">${fmtFecha(d)} <span onclick="App.quitarFeriado('${d}')" style="cursor:pointer;font-weight:700;margin-left:4px">✕</span></span>`).join('')
    : '<span style="color:var(--muted);font-size:12px">Sin feriados cargados</span>';

  let totalGeneral = 0;
  const resumen = cfg.docentes.map(doc => {
    const r = calcularDocente(doc, mes, data, cfg);
    totalGeneral += r.total;
    return { nombre: doc.n, ...r };
  });

  $('habResumen').innerHTML = `
    <div class="hab-resumen-grid">
      ${resumen.map(r => `
        <div class="hab-res-card" onclick="App.scrollDocente('${r.nombre}')">
          <div class="hab-res-nombre">${r.nombre}</div>
          <div class="hab-res-horas">${r.totalHoras} h${r.totalExtras !== 0 ? ' + extras' : ''}</div>
          <div class="hab-res-monto">${fmt(r.total)}</div>
        </div>`).join('')}
    </div>
    <div class="hab-total-general"><span>Total a pagar en ${mes}</span><strong>${fmt(totalGeneral)}</strong></div>`;

  $('habDocentes').innerHTML = cfg.docentes.map((doc, di) => {
    const r = calcularDocente(doc, mes, data, cfg);

    const cursosHtml = r.detalleCursos.map(dc => {
      const diasStr = dc.ds.map(d => DNMS[d]).join('/');
      const filasHtml = dc.clases.map(cl => `
        <div class="clase-row">
          <label class="clase-check">
            <input type="checkbox" ${cl.presente ? 'checked' : ''}
              onchange="App.toggleClase('${doc.n}','${cl.fecha}','${dc.curso}',this.checked,${cl.hDefault})">
            <span class="${!cl.presente ? 'ausente' : ''}">${fmtFecha(cl.fecha)}</span>
          </label>
          <input type="number" value="${cl.h}" min="0" step="0.5"
            onchange="App.updateHorasClase('${doc.n}','${cl.fecha}','${dc.curso}',this.value)" class="clase-horas">
          <span class="clase-h-lbl">h</span>
          <span class="clase-monto ${!cl.presente ? 'ausente' : ''}">${cl.presente ? fmt(cl.h * r.vhDoc) : '−'}</span>
        </div>`).join('');
      return `
        <div class="curso-block">
          <div class="curso-title">${dc.curso} <span class="curso-dias">${diasStr}</span></div>
          ${filasHtml || '<div style="font-size:11px;color:var(--muted)">Sin clases este mes</div>'}
          <div class="curso-subtotal">Subtotal: ${dc.horasCurso} h · ${fmt(dc.horasCurso * r.vhDoc)}</div>
        </div>`;
    }).join('');

    const extrasHtml = (r.extras || []).map((e, ei) => `
      <div class="extra-row">
        <span>${e.concepto}</span>
        <strong class="${e.monto < 0 ? 'neg' : ''}">${e.monto < 0 ? '−' : ''}${fmt(Math.abs(e.monto))}</strong>
        <button class="btn-icon danger" onclick="App.quitarExtraHaber('${doc.n}',${ei})" title="Quitar">✕</button>
      </div>`).join('');

    return `
      <div class="hab-docente" id="hab-doc-${di}">
        <div class="hab-doc-header">
          <div class="hab-doc-nombre">${doc.n}</div>
          <div class="hab-doc-total">${fmt(r.total)}</div>
        </div>
        <div class="hab-doc-body">
          <div class="hab-valores">
            <div class="hv-item">
              <label>Valor hora docente</label>
              <input type="number" value="${r.vhDoc}" min="0" step="500"
                onchange="App.setValorHora('${doc.n}','vhDoc',this.value)">
            </div>
            <div class="hv-item">
              <label>Valor hora administración</label>
              <input type="number" value="${r.vhAdm}" min="0" step="500"
                onchange="App.setValorHora('${doc.n}','vhAdm',this.value)">
            </div>
            <div class="hv-item">
              <label>Horas administrativas del mes</label>
              <input type="number" value="${r.horasAdm}" min="0" step="0.5"
                onchange="App.setValorHora('${doc.n}','horasAdm',this.value)">
            </div>
          </div>
          ${cursosHtml}
          <div class="hab-extras">
            <div class="hab-extras-title">Conceptos extra</div>
            ${extrasHtml || '<div style="font-size:11px;color:var(--muted)">Ninguno</div>'}
            <button class="btn btn-ghost btn-sm" onclick="App.agregarExtraHaber('${doc.n}')" style="margin-top:8px">➕ Agregar concepto</button>
          </div>
          <div class="hab-doc-resumen">
            <div class="hdr-line"><span>Horas de clase</span><span>${r.totalHoras} h · ${fmt(r.montoHoras)}</span></div>
            ${r.horasAdm > 0 ? `<div class="hdr-line"><span>Horas administración</span><span>${r.horasAdm} h · ${fmt(r.montoAdm)}</span></div>` : ''}
            ${r.totalExtras !== 0 ? `<div class="hdr-line"><span>Extras</span><span class="${r.totalExtras < 0 ? 'neg' : ''}">${r.totalExtras < 0 ? '−' : ''}${fmt(Math.abs(r.totalExtras))}</span></div>` : ''}
            <div class="hdr-line total"><span>Total ${doc.n}</span><span>${fmt(r.total)}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn btn-wa" style="flex:1" onclick="App.enviarHaberWhatsApp('${doc.n}')">📲 Enviar</button>
            <button class="btn btn-gold" style="flex:1" onclick="App.comprobanteHaber('${doc.n}')">📄 Comprobante</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════
//  ACCIONES: clases, feriados, extras
// ════════════════════════════════════════════════
export function toggleClase(docN, fecha, curso, presente, hDefault) {
  const mes = mesHabSel, data = getHabData(mes);
  if (!data.clases[docN]) data.clases[docN] = {};
  const key = `${docN}|${fecha}|${curso}`;
  const prev = data.clases[docN][key] || { h: hDefault };
  data.clases[docN][key] = { presente, h: prev.h != null ? prev.h : hDefault };
  saveHabData(mes, data); renderHaberes();
}

export function updateHorasClase(docN, fecha, curso, val) {
  const mes = mesHabSel, data = getHabData(mes);
  if (!data.clases[docN]) data.clases[docN] = {};
  const key = `${docN}|${fecha}|${curso}`;
  const prev = data.clases[docN][key] || { presente: true };
  data.clases[docN][key] = { presente: prev.presente !== false, h: parseFloat(val) || 0 };
  saveHabData(mes, data); renderHaberes();
}


// ── Editar valores de hora (docente/admin) y horas admin por docente y mes ──
export function setValorHora(docN, campo, val) {
  const mes = mesHabSel, data = getHabData(mes);
  if (!data.valores) data.valores = {};
  if (!data.valores[docN]) data.valores[docN] = {};
  data.valores[docN][campo] = parseFloat(val) || 0;
  saveHabData(mes, data);
  const nombres = { vhDoc: 'valor hora docente', vhAdm: 'valor hora admin', horasAdm: 'horas admin' };
  logA('HABERES', `Actualizó ${nombres[campo] || campo} de ${docN} en ${mes}`, fmt(parseFloat(val) || 0));
  renderHaberes();
}

export function agregarFeriado() {
  const f = $('habFeriadoFecha').value;
  if (!f) { alert('Elegí una fecha'); return; }
  const mes = mesHabSel, data = getHabData(mes);
  if (!data.nl) data.nl = [];
  if (!data.nl.includes(f)) data.nl.push(f);
  saveHabData(mes, data);
  logA('HABERES', `Cargó feriado ${f} en ${mes}`);
  $('habFeriadoFecha').value = ''; renderHaberes();
}

export function quitarFeriado(f) {
  const mes = mesHabSel, data = getHabData(mes);
  data.nl = (data.nl || []).filter(x => x !== f);
  saveHabData(mes, data); renderHaberes();
}

export function agregarExtraHaber(docN) {
  const concepto = prompt(`Concepto extra para ${docN}\n(ej: Bono, Reemplazo, Adelanto, Descuento)`);
  if (!concepto || !concepto.trim()) return;
  const montoStr = prompt(`Monto para "${concepto.trim()}"\n(usá negativo para descontar, ej: -5000)`);
  if (montoStr === null) return;
  const monto = parseInt(montoStr);
  if (isNaN(monto)) { alert('Monto inválido'); return; }
  const mes = mesHabSel, data = getHabData(mes);
  if (!data.extras) data.extras = {};
  if (!data.extras[docN]) data.extras[docN] = [];
  data.extras[docN].push({ concepto: concepto.trim(), monto });
  saveHabData(mes, data);
  logA('HABERES', `Extra "${concepto.trim()}" (${fmt(monto)}) a ${docN} en ${mes}`);
  renderHaberes();
}

export function quitarExtraHaber(docN, idx) {
  const mes = mesHabSel, data = getHabData(mes);
  if (data.extras && data.extras[docN]) {
    data.extras[docN].splice(idx, 1);
    saveHabData(mes, data); renderHaberes();
  }
}

export function scrollDocente(nombre) {
  const cfg = getHabCfg();
  const di = cfg.docentes.findIndex(d => d.n === nombre);
  if (di >= 0) { const el = $('hab-doc-' + di); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

// ════════════════════════════════════════════════
//  COMPROBANTE PDF + WHATSAPP
// ════════════════════════════════════════════════
function construirComprobante(docN) {
  const mes = mesHabSel, cfg = getHabCfg(), data = getHabData(mes);
  const doc2 = cfg.docentes.find(d => d.n === docN);
  if (!doc2) return null;
  const r = calcularDocente(doc2, mes, data, cfg);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });

  pdf.setFillColor(15, 31, 61); pdf.rect(0, 0, 148, 210, 'F');
  pdf.setFillColor(255, 255, 255); pdf.rect(8, 8, 132, 194, 'F');

  try { pdf.addImage(LOGO_B64, 'PNG', 16, 14, 16, 13); } catch (e) {}
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(15, 31, 61);
  pdf.text("Let's", 74, 22, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120, 116, 112);
  pdf.text('Innovation English Institute · Bernal', 74, 28, { align: 'center' });

  pdf.setFillColor(240, 236, 227); pdf.roundedRect(30, 33, 88, 8, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(15, 31, 61);
  pdf.text(`Liquidación — ${mes} 2026`, 74, 38.5, { align: 'center' });

  let y = 52;
  pdf.setFontSize(11); pdf.setTextColor(26, 24, 20);
  pdf.setFont('helvetica', 'bold'); pdf.text('Docente:', 16, y);
  pdf.setFont('helvetica', 'normal'); pdf.text(docN, 42, y);
  y += 9;

  pdf.setFontSize(9); pdf.setTextColor(120, 116, 112);
  pdf.setFont('helvetica', 'bold'); pdf.text('Detalle por curso', 16, y); y += 5.5;
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 24, 20);
  r.detalleCursos.forEach(dc => {
    if (dc.horasCurso > 0) {
      pdf.text(dc.curso.length > 36 ? dc.curso.substring(0, 36) + '…' : dc.curso, 16, y);
      pdf.text(`${dc.horasCurso} h`, 108, y, { align: 'right' });
      pdf.text(fmt(dc.horasCurso * cfg.vh), 132, y, { align: 'right' });
      y += 5.5;
    }
  });

  y += 2; pdf.setDrawColor(220, 216, 206); pdf.line(16, y, 132, y); y += 6;
  pdf.text(`Horas clase: ${r.totalHoras} h × ${fmt(r.vhDoc)}`, 16, y);
  pdf.text(fmt(r.montoHoras), 132, y, { align: 'right' }); y += 6;
  if (r.horasAdm > 0) {
    pdf.text(`Horas admin.: ${r.horasAdm} h × ${fmt(r.vhAdm)}`, 16, y);
    pdf.text(fmt(r.montoAdm), 132, y, { align: 'right' }); y += 6;
  }

  if (r.extras && r.extras.length) {
    r.extras.forEach(e => {
      pdf.text(e.concepto, 16, y);
      pdf.text((e.monto < 0 ? '−' : '') + fmt(Math.abs(e.monto)), 132, y, { align: 'right' });
      y += 5.5;
    });
    y += 1;
  }

  y += 2;
  pdf.setFillColor(15, 31, 61); pdf.roundedRect(14, y, 120, 13, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL A PAGAR', 20, y + 8.5);
  pdf.text(fmt(r.total), 128, y + 8.5, { align: 'right' });
  y += 20;

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(120, 116, 112);
  pdf.text(`Emitido el ${new Date().toLocaleDateString('es-AR')}`, 74, y, { align: 'center' });

  return { pdf, r };
}

export function comprobanteHaber(docN) {
  const res = construirComprobante(docN);
  if (!res) return;
  res.pdf.save(`Haberes_${mesHabSel}_${docN.replace(/ /g, '_')}.pdf`);
  logA('HABERES', `Generó comprobante de ${docN} (${mesHabSel})`);
}

export function enviarHaberWhatsApp(docN) {
  const mes = mesHabSel, cfg = getHabCfg(), data = getHabData(mes);
  const doc2 = cfg.docentes.find(d => d.n === docN);
  if (!doc2) return;
  const r = calcularDocente(doc2, mes, data, cfg);
  comprobanteHaber(docN);
  const texto =
    `Hola ${docN}! Te paso la liquidación de ${mes} 💼\n\n` +
    `Horas trabajadas: ${r.totalHoras} h\n` +
    (r.totalExtras !== 0 ? `Extras: ${r.totalExtras < 0 ? '−' : ''}${fmt(Math.abs(r.totalExtras))}\n` : '') +
    `Total: ${fmt(r.total)}\n\n` +
    `Let's Innovation English Institute`;
  setTimeout(() => { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank'); }, 400);
}

registerPage('haberes', renderHaberes);
