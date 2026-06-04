// ════════════════════════════════════════════════
//  modules/dashboard.js — Panel principal
// ════════════════════════════════════════════════
import { $, fmt, MESES } from '../core/dom.js';
import { state } from '../core/store.js';
import { registerPage } from '../core/router.js';

const mesActual = () => MESES[new Date().getMonth()];

export function renderDashboard() {
  const mes = mesActual();
  const cuotasMes = state.pagos.filter(p => p.mes === mes && p.concepto === 'Cuota mensual');
  const totalMes = state.pagos.filter(p => p.mes === mes).reduce((s, p) => s + p.total, 0);
  const ef = state.pagos.filter(p => p.forma === 'efectivo').length;
  const tr = state.pagos.filter(p => p.forma === 'transferencia').length;
  const activos = state.ALUMNOS.filter(a => a.estado === 'Activo').length;
  const totalRecaudado = state.pagos.reduce((s, p) => s + p.total, 0);

  $('kpiGrid').innerHTML = `
    <div class="kpi blue"><div class="kpi-val">${activos}</div><div class="kpi-label">Alumnos activos</div></div>
    <div class="kpi green"><div class="kpi-val">${cuotasMes.length}</div><div class="kpi-label">Cuotas ${mes}</div></div>
    <div class="kpi red"><div class="kpi-val">${Math.max(0, activos - cuotasMes.length)}</div><div class="kpi-label">Pendientes ${mes}</div></div>
    <div class="kpi amber"><div class="kpi-val small">${fmt(totalMes)}</div><div class="kpi-label">Recaudado ${mes}</div></div>
    <div class="kpi green"><div class="kpi-val">${ef}</div><div class="kpi-label">Pagos efectivo</div></div>
    <div class="kpi violet"><div class="kpi-val">${tr}</div><div class="kpi-label">Transferencias</div></div>`;

  // Distribución efectivo/transferencia (barra visual)
  const totalFormas = ef + tr;
  const pctEf = totalFormas ? Math.round(ef / totalFormas * 100) : 0;
  const pctTr = 100 - pctEf;
  $('formasBar').innerHTML = totalFormas ? `
    <div class="section-label">Formas de pago (histórico)</div>
    <div class="formas-bar">
      <div class="formas-seg ef" style="width:${pctEf}%">${pctEf > 12 ? pctEf + '%' : ''}</div>
      <div class="formas-seg tr" style="width:${pctTr}%">${pctTr > 12 ? pctTr + '%' : ''}</div>
    </div>
    <div class="formas-leg"><span>💵 Efectivo: ${ef}</span><span>🏦 Transferencia: ${tr}</span></div>` : '';

  // Últimos pagos
  const last5 = [...state.pagos].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  $('lastPayments').innerHTML = last5.length ? last5.map(p => `
    <div class="dash-pago">
      <div><div class="dash-pago-n">${p.alumnoNombre}</div>
      <div class="dash-pago-d">${p.concepto}${p.mes ? ' · ' + p.mes : ''} · ${p.fecha}</div></div>
      <div class="dash-pago-v">${fmt(p.total)}</div>
    </div>`).join('') : '<div class="empty-state"><div class="icon">📭</div>Sin pagos aún</div>';
}

registerPage('dashboard', renderDashboard);
