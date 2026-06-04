// ════════════════════════════════════════════════
//  modules/tarifas.js — Ver y editar tarifas
// ════════════════════════════════════════════════
import { $, fmt } from '../core/dom.js';
import { state, KEYS, saveJ } from '../core/store.js';
import { logA } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { TARIFAS_BASE } from '../data/tarifas.js';
import { registerPage } from '../core/router.js';

let viewing = 'actual'; // 'actual' (Mar-Abr) o 'nueva' (Mayo en adelante)

export function setTarifaVista(modo) {
  viewing = modo;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.modo === modo));
  $('tarifaMesLabel').textContent = modo === 'actual' ? '📅 Marzo / Abril 2026' : '📅 Mayo 2026 en adelante';
  renderTarifas();
}

export function renderTarifas() {
  if (!state.tarifasMayo || !Object.keys(state.tarifasMayo).length) {
    state.tarifasMayo = JSON.parse(JSON.stringify(TARIFAS_BASE));
  }
  const tarifas = viewing === 'actual' ? TARIFAS_BASE : state.tarifasMayo;
  const cursos = Object.keys(TARIFAS_BASE);

  // Tabla de visualización
  $('tarifaGrid').innerHTML = cursos.map((c, i) => {
    const t = tarifas[c] || TARIFAS_BASE[c];
    return `<div class="tarifa-row ${i % 2 ? 'alt' : ''}">
      <div class="tarifa-curso">${c}</div>
      <div class="tarifa-val tr">${fmt(t.transferencia)}</div>
      <div class="tarifa-val ef">${fmt(t.efectivo)}</div>
    </div>`;
  }).join('');

  // Formulario de edición (solo Mayo en adelante)
  $('editTarifasWrap').style.display = viewing === 'nueva' ? 'block' : 'none';
  if (viewing === 'nueva') {
    $('editTarifas').innerHTML = cursos.map(c => {
      const t = state.tarifasMayo[c] || TARIFAS_BASE[c];
      const k = c.replace(/[^a-z0-9]/gi, '_');
      return `<div class="edit-tarifa">
        <label style="font-size:10px">${c}</label>
        <div style="display:flex;gap:6px">
          <input type="number" id="et_tr_${k}" value="${t.transferencia}" placeholder="Transf." style="width:50%">
          <input type="number" id="et_ef_${k}" value="${t.efectivo}" placeholder="Efect." style="width:50%">
        </div>
      </div>`;
    }).join('');
  }
}

export function guardarTarifasNuevas() {
  const cursos = Object.keys(TARIFAS_BASE);
  cursos.forEach(c => {
    const k = c.replace(/[^a-z0-9]/gi, '_');
    const tr = parseInt($('et_tr_' + k)?.value || 0);
    const ef = parseInt($('et_ef_' + k)?.value || 0);
    state.tarifasMayo[c] = { ...TARIFAS_BASE[c], transferencia: tr, efectivo: ef };
  });
  saveJ(KEYS.TARIFAS_MAYO, state.tarifasMayo);
  if (FS) FS.set('config', 'tarifas_mayo', state.tarifasMayo);
  logA('TARIFA', 'Actualizó tarifas (Mayo en adelante)');
  alert('✅ Tarifas guardadas correctamente');
  renderTarifas();
}

// Aumento porcentual masivo
export function aplicarAumento() {
  const pct = parseFloat($('aumentoPct').value);
  if (!pct || pct <= 0) { alert('Ingresá un porcentaje válido'); return; }
  if (!confirm(`¿Aumentar todas las tarifas de Mayo en adelante un ${pct}%?`)) return;
  const cursos = Object.keys(TARIFAS_BASE);
  cursos.forEach(c => {
    const base = state.tarifasMayo[c] || TARIFAS_BASE[c];
    state.tarifasMayo[c] = {
      ...base,
      matricula: Math.round(base.matricula * (1 + pct / 100)),
      transferencia: Math.round(base.transferencia * (1 + pct / 100)),
      efectivo: Math.round(base.efectivo * (1 + pct / 100)),
    };
  });
  saveJ(KEYS.TARIFAS_MAYO, state.tarifasMayo);
  if (FS) FS.set('config', 'tarifas_mayo', state.tarifasMayo);
  logA('TARIFA', `Aumento masivo ${pct}%`);
  alert(`✅ Tarifas aumentadas ${pct}%`);
  $('aumentoPct').value = '';
  renderTarifas();
}

registerPage('tarifas', renderTarifas);
