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
  const cuotasMes = state.pagos.filter(p => p.mes === mes && p.concepto === 'Cuota mensual');
  const cuotasTr = cuotasMes.filter(p => p.forma === 'transferencia').reduce((s, p) => s + p.total, 0);
  const cuotasEf = cuotasMes.filter(p => p.forma === 'efectivo').reduce((s, p) => s + p.total, 0);
  const matTotal = state.pagos.filter(p => p.concepto === 'Matrícula 2026' && p.fecha && MESES[new Date(p.fecha).getMonth()] === mes)
    .reduce((s, p) => s + p.total, 0);
  return { cuotasTr, cuotasEf, matTotal, total: cuotasTr + cuotasEf + matTotal };
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

export function renderRentabilidad() {
  const sel = $('rentMes');
  if (sel && sel.options.length === 0) {
    sel.innerHTML = MESES_LECTIVOS.map(m => `<option value="${m}">${m} 2026</option>`).join('');
    sel.value = MESES[new Date().getMonth()] || 'Marzo';
  }
  const mes = $('rentMes').value;

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

  // Ingresos detalle
  $('rentIngresos').innerHTML = `
    <div class="rent-row"><span>Cuotas (Transferencia)</span><strong>${fmt(ingresos.cuotasTr)}</strong></div>
    <div class="rent-row"><span>Cuotas (Efectivo)</span><strong>${fmt(ingresos.cuotasEf)}</strong></div>
    <div class="rent-row"><span>Matrículas</span><strong>${fmt(ingresos.matTotal)}</strong></div>
    <div class="rent-row total"><span>Total ingresos</span><strong>${fmt(ingresos.total)}</strong></div>`;

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
  const mes = $('rentMes').value;
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
