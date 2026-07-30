// ════════════════════════════════════════════════
//  modules/tarifas.js — fijación de tarifas por mes
//  Cada mes tiene su tabla. Aumentos independientes efectivo/transferencia
//  (por % o monto fijo) + ajuste manual por curso.
// ════════════════════════════════════════════════
import { $, fmt } from '../core/dom.js';
import { state, KEYS, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { registerPage } from '../core/router.js';
import { TARIFAS_BASE, MESES_TARIFA, getTarifasMes } from '../data/lista-tarifas.js';

let mesTarSel = null;

// Devuelve la tabla del mes seleccionado (copia editable); si no existe, la hereda
function tablaDelMes(mes) {
  if (!state.tarifasMes) state.tarifasMes = {};
  if (!state.tarifasMes[mes] || !Object.keys(state.tarifasMes[mes]).length) {
    // Clonar lo que corresponda por herencia, para arrancar a editar
    state.tarifasMes[mes] = JSON.parse(JSON.stringify(getTarifasMes(mes)));
  }
  return state.tarifasMes[mes];
}

function guardarMes(mes) {
  saveJ(KEYS.TARIFAS_MES, state.tarifasMes);
  if (FS) FS.set('config', 'tarifas_mes', state.tarifasMes);
}

export function seleccionarMesTar(mes) { mesTarSel = mes; renderTarifas(); }

export function renderTarifas() {
  if (!mesTarSel) mesTarSel = 'Marzo';
  const mes = mesTarSel;
  const tar = tablaDelMes(mes);

  // Botones de mes
  const btns = $('tarMesesBtns');
  if (btns) {
    btns.innerHTML = MESES_TARIFA.map(m =>
      `<button class="mes-btn ${m === mes ? 'active' : ''}" onclick="App.seleccionarMesTar('${m}')">${m.slice(0, 3)}</button>`
    ).join('');
  }

  // Tabla editable por curso
  const cursos = Object.keys(TARIFAS_BASE);
  $('tarGrid').innerHTML = `
    <div class="tar-row tar-head">
      <div>Curso</div><div>Matrícula</div><div>Transferencia</div><div>Efectivo</div>
    </div>
    ${cursos.map((c, i) => {
      const t = tar[c] || TARIFAS_BASE[c];
      const k = c.replace(/[^a-z0-9]/gi, '_');
      return `<div class="tar-row ${i % 2 ? 'alt' : ''}">
        <div class="tar-curso">${c}</div>
        <div><input type="number" id="tar_mat_${k}" value="${t.matricula}" onchange="App.ajusteManualTarifa('${c}','matricula',this.value)"></div>
        <div><input type="number" id="tar_tr_${k}" value="${t.transferencia}" onchange="App.ajusteManualTarifa('${c}','transferencia',this.value)"></div>
        <div><input type="number" id="tar_ef_${k}" value="${t.efectivo}" onchange="App.ajusteManualTarifa('${c}','efectivo',this.value)"></div>
      </div>`;
    }).join('')}`;
}

// ── Ajuste manual de un precio puntual ──
export function ajusteManualTarifa(curso, campo, val) {
  const mes = mesTarSel;
  const tar = tablaDelMes(mes);
  if (!tar[curso]) tar[curso] = { ...TARIFAS_BASE[curso] };
  tar[curso][campo] = parseInt(val) || 0;
  guardarMes(mes);
  logA('TARIFA', `Ajustó ${campo} de ${curso} en ${mes}`, fmt(parseInt(val) || 0));
}

// ── Aumento general a TODOS los cursos, por forma de pago ──
// forma: 'transferencia' | 'efectivo' | 'ambos'
// tipo: 'porc' | 'monto'
export function aplicarAumentoTarifa(forma) {
  const tipo = $(`aum_tipo_${forma}`).value;      // porc | monto
  const valor = parseFloat($(`aum_valor_${forma}`).value);
  if (isNaN(valor) || valor === 0) { alert('Ingresá un valor de aumento'); return; }

  const mes = mesTarSel;
  const tar = tablaDelMes(mes);
  const cursos = Object.keys(TARIFAS_BASE);
  const campos = forma === 'ambos' ? ['transferencia', 'efectivo'] : [forma];

  const label = tipo === 'porc' ? `${valor}%` : fmt(valor);
  const nombreForma = forma === 'ambos' ? 'ambas formas' : forma;
  if (!confirm(`Aplicar aumento de ${label} a ${nombreForma}, en TODOS los cursos de ${mes}?`)) return;

  cursos.forEach(c => {
    if (!tar[c]) tar[c] = { ...TARIFAS_BASE[c] };
    campos.forEach(campo => {
      const actual = tar[c][campo] || 0;
      const nuevo = tipo === 'porc'
        ? Math.round(actual * (1 + valor / 100))
        : actual + valor;
      tar[c][campo] = Math.max(0, nuevo);
    });
  });

  guardarMes(mes);
  logA('TARIFA', `Aumento ${label} a ${nombreForma} en ${mes}`, `${cursos.length} cursos`);
  $(`aum_valor_${forma}`).value = '';
  renderTarifas();
  alert(`✅ Aumento aplicado a ${mes}`);
}

// ── Copiar la tarifa de otro mes al mes actual ──
export function copiarTarifaDesde() {
  const desde = $('tarCopiarDesde').value;
  if (!desde) { alert('Elegí un mes de origen'); return; }
  const mes = mesTarSel;
  if (desde === mes) { alert('Es el mismo mes'); return; }
  if (!confirm(`Copiar la tarifa de ${desde} a ${mes}? Se reemplaza lo que haya en ${mes}.`)) return;

  const origen = tablaDelMes(desde);
  state.tarifasMes[mes] = JSON.parse(JSON.stringify(origen));
  guardarMes(mes);
  logA('TARIFA', `Copió tarifa de ${desde} a ${mes}`);
  renderTarifas();
  alert(`✅ Tarifa de ${desde} copiada a ${mes}`);
}

registerPage('tarifas', renderTarifas);
