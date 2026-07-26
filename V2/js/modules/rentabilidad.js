// ════════════════════════════════════════════════
//  modules/rentabilidad.js — Estado de resultados mensual
// ════════════════════════════════════════════════
import { $, fmt, MESES, MESES_LECTIVOS } from '../core/dom.js';
import { state, KEYS, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { registerPage } from '../core/router.js';

// Gastos base mensuales
const GASTOS_BASE = [
  { key: 'haberes',    label: 'Haberes Docentes',   valor: 0,      tipo: 'auto' },
  { key: 'alquiler',   label: 'Alquiler',           valor: 786400, tipo: 'fijo' },
  { key: 'luz',        label: 'EDESUR (Luz)',       valor: 70000,  tipo: 'variable' },
  { key: 'gas',        label: 'Metrogas (Gas)',     valor: 7500,   tipo: 'variable' },
  { key: 'agua',       label: 'AYSA (Agua)',        valor: 32000,  tipo: 'fijo' },
  { key: 'monotributo',label: 'Monotributo (ARCA)', valor: 52231,  tipo: 'fijo' },
  { key: 'municipal',  label: 'Impuesto Municipal', valor: 56300,  tipo: 'fijo' },
  { key: 'alarma',     label: 'ADT (Alarma)',       valor: 62580,  tipo: 'fijo' },
  { key: 'seguro',     label: 'Segurcoop (Seguro)', valor: 33200,  tipo: 'fijo' },
  { key: 'internet',   label: 'Movistar (Internet)',valor: 47200,  tipo: 'fijo' },
  { key: 'material',   label: 'Material Didáctico',  valor: 0,      tipo: 'variable' },
  { key: 'varios',     label: 'Gastos Varios',       valor: 0,      tipo: 'variable' },
];
const MESES_ALQUILER_AJUSTE = ['Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Ingresos del mes (cuotas + matrículas de ese mes)
function getIngresosMes(mes) {
  // Cuotas del mes
  const cuotasMes = state.pagos.filter(p => p.mes === mes && p.concepto === 'Cuota mensual');
  const cuotasTr = cuotasMes.filter(p => p.forma === 'transferencia').reduce((s, p) => s + p.total, 0);
  const cuotasEf = cuotasMes.filter(p => p.forma === 'efectivo').reduce((s, p) => s + p.total, 0);

  // Matrículas del mes (por fecha de pago)
  const matMes = state.pagos.filter(p => p.concepto === 'Matrícula 2026' && p.fecha && MESES[new Date(p.fecha).getMonth()] === mes);
  const matTr = matMes.filter(p => p.forma === 'transferencia').reduce((s, p) => s + p.total, 0);
  const matEf = matMes.filter(p => p.forma === 'efectivo').reduce((s, p) => s + p.total, 0);
  const matTotal = matTr + matEf;

  // Totales por forma de pago (cuotas + matrículas juntas)
  const totalEf = cuotasEf + matEf;
  const totalTr = cuotasTr + matTr;
  const total = totalEf + totalTr;

  // Porcentajes sobre el total del mes
  const pctEf = total > 0 ? Math.round((totalEf / total) * 100) : 0;
  const pctTr = total > 0 ? Math.round((totalTr / total) * 100) : 0;

  // Cantidad de operaciones por forma
  const nEf = cuotasMes.filter(p => p.forma === 'efectivo').length + matMes.filter(p => p.forma === 'efectivo').length;
  const nTr = cuotasMes.filter(p => p.forma === 'transferencia').length + matMes.filter(p => p.forma === 'transferencia').length;

  return { cuotasTr, cuotasEf, matTr, matEf, matTotal, totalEf, totalTr, pctEf, pctTr, nEf, nTr, total };
}

// Gastos del mes (guardados o base)
function getGastosMes(mes) {
  if (!state.rentData[mes]) {
    state.rentData[mes] = GASTOS_BASE.map(g => ({
      ...g,
      valor: g.key === 'alquiler' && MESES_ALQUILER_AJUSTE.includes(mes) ? 857116 : g.valor
    }));
  }
  return state.rentData[mes];
}

let mesRentSel = null;

export function seleccionarMesRent(mes) {
  mesRentSel = mes;
  renderRentabilidad();
}

export function renderRentabilidad() {
  // Mes por defecto: el actual, o Marzo
  if (!mesRentSel) mesRentSel = MESES[new Date().getMonth()] || 'Marzo';
  if (!MESES_LECTIVOS.includes(mesRentSel)) mesRentSel = 'Marzo';
  const mes = mesRentSel;

  // Botones de mes
  const cont = $('rentMesesBtns');
  if (cont) {
    cont.innerHTML = MESES_LECTIVOS.map(m =>
      `<button class="mes-btn ${m === mes ? 'active' : ''}" onclick="App.seleccionarMesRent('${m}')">${m.slice(0, 3)}</button>`
    ).join('');
  }

  const ingresos = getIngresosMes(mes);
  const gastos = getGastosMes(mes);
  const extras = state.rentData[mes + '_extra'] || [];
  const totalFijos = gastos.filter(g => g.key !== 'haberes').reduce((s, g) => s + g.valor, 0);
  const haberes = gastos.find(g => g.key === 'haberes')?.valor || 0;
  const totalExtra = extras.reduce((s, g) => s + g.valor, 0);
  const totalEgresos = totalFijos + haberes + totalExtra;
  const resultado = ingresos.total - totalEgresos;
  const margen = ingresos.total > 0 ? ((resultado / ingresos.total) * 100).toFixed(1) : '0';

  // KPIs
  $('rentKpis').innerHTML = `
    <div class="kpi green"><div class="kpi-val small">${fmt(ingresos.total)}</div><div class="kpi-label">Ingresos</div></div>
    <div class="kpi red"><div class="kpi-val small">${fmt(totalEgresos)}</div><div class="kpi-label">Egresos</div></div>
    <div class="kpi ${resultado >= 0 ? 'green' : 'red'}"><div class="kpi-val small">${fmt(resultado)}</div><div class="kpi-label">Resultado neto</div></div>
    <div class="kpi ${resultado >= 0 ? 'green' : 'red'}"><div class="kpi-val">${margen}%</div><div class="kpi-label">Margen</div></div>`;

  // Ingresos detalle — separado por forma de pago con porcentajes
  $('rentIngresos').innerHTML = `
    <div class="ingreso-forma efectivo">
      <div class="if-top">
        <div class="if-label">💵 Efectivo</div>
        <div class="if-pct">${ingresos.pctEf}%</div>
      </div>
      <div class="if-monto">${fmt(ingresos.totalEf)}</div>
      <div class="if-detalle">${ingresos.nEf} operaci${ingresos.nEf === 1 ? 'ón' : 'ones'} · Cuotas ${fmt(ingresos.cuotasEf)} · Matrículas ${fmt(ingresos.matEf)}</div>
    </div>

    <div class="ingreso-forma transferencia">
      <div class="if-top">
        <div class="if-label">🏦 Transferencia</div>
        <div class="if-pct">${ingresos.pctTr}%</div>
      </div>
      <div class="if-monto">${fmt(ingresos.totalTr)}</div>
      <div class="if-detalle">${ingresos.nTr} operaci${ingresos.nTr === 1 ? 'ón' : 'ones'} · Cuotas ${fmt(ingresos.cuotasTr)} · Matrículas ${fmt(ingresos.matTr)}</div>
    </div>

    <div class="ingreso-barra">
      <div class="ib-ef" style="width:${ingresos.pctEf}%" title="Efectivo ${ingresos.pctEf}%"></div>
      <div class="ib-tr" style="width:${ingresos.pctTr}%" title="Transferencia ${ingresos.pctTr}%"></div>
    </div>

    <div class="rent-row total" style="margin-top:12px"><span>Total ingresos</span><strong>${fmt(ingresos.total)}</strong></div>`;

  // Egresos detalle (editables)
  $('rentEgresos').innerHTML = gastos.map((g, i) => {
    if (g.key === 'haberes') {
      return `<div class="rent-row"><span>${g.label} <span class="rent-tag">auto</span></span>
        <input type="number" id="rg_${i}" value="${g.valor}" class="rent-input" onchange="App.updateGasto('${mes}',${i})"></div>`;
    }
    return `<div class="rent-row"><span>${g.label}</span>
      <input type="number" id="rg_${i}" value="${g.valor}" class="rent-input" onchange="App.updateGasto('${mes}',${i})"></div>`;
  }).join('') + `
    <div class="rent-row total"><span>Total egresos</span><strong>${fmt(totalEgresos)}</strong></div>`;

  // Resultado final
  $('rentResultado').innerHTML = `
    <div class="rent-final ${resultado >= 0 ? 'pos' : 'neg'}">
      <div class="rent-final-label">Resultado de ${mes}</div>
      <div class="rent-final-val">${fmt(resultado)}</div>
      <div class="rent-final-margen">Margen: ${margen}%</div>
    </div>`;
}

export function updateGasto(mes, idx) {
  const val = parseInt($('rg_' + idx).value) || 0;
  state.rentData[mes][idx].valor = val;
  saveJ(KEYS.RENT, state.rentData);
  if (FS) FS.set('rentabilidad', mes, { mes, data: state.rentData[mes], extra: state.rentData[mes + '_extra'] || [] });
  renderRentabilidad();
}

export function exportRentCSV() {
  const mes = mesRentSel || (MESES[new Date().getMonth()] || 'Marzo');
  const ingresos = getIngresosMes(mes);
  const gastos = getGastosMes(mes);
  const rows = [
    ['ESTADO DE RESULTADOS', mes + ' 2026'],
    [],
    ['INGRESOS', ''],
    ['Cuotas Transferencia', ingresos.cuotasTr],
    ['Cuotas Efectivo', ingresos.cuotasEf],
    ['Matrículas', ingresos.matTotal],
    ['Total Ingresos', ingresos.total],
    [],
    ['EGRESOS', ''],
    ...gastos.map(g => [g.label, g.valor]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csv);
  a.download = `lets_rentabilidad_${mes}_2026.csv`;
  a.click();
}

registerPage('rentabilidad', renderRentabilidad);
