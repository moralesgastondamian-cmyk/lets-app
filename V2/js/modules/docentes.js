// ════════════════════════════════════════════════
//  modules/docentes.js — gestión de docentes y sus cursos
//  Permite agregar, editar, quitar docentes y sus cursos (días/horas),
//  y heredar los cursos de otro docente (útil para reemplazos).
// ════════════════════════════════════════════════
import { $, DNMS } from '../core/dom.js';
import { logA } from '../core/auth.js';
import { registerPage } from '../core/router.js';
import { getHabCfg, saveHabCfg } from './haberes.js';
import { TARIFAS_BASE } from '../data/lista-tarifas.js';

// Índice del docente que se está editando (null = creando uno nuevo)
let editIdx = null;
// Cursos que se están editando en el modal (copia de trabajo)
let cursosEdit = [];

const DIAS = [
  { v: 1, n: 'Lun' }, { v: 2, n: 'Mar' }, { v: 3, n: 'Mié' },
  { v: 4, n: 'Jue' }, { v: 5, n: 'Vie' }, { v: 6, n: 'Sáb' },
];

export function renderDocentes() {
  const cfg = getHabCfg();

  $('docValorHora').value = cfg.vh || 14000;

  $('docentesList').innerHTML = cfg.docentes.map((d, i) => {
    const cursosTxt = d.cursos.map(c => {
      const dias = c.ds.map(x => DNMS[x]).join('/');
      return `<div class="doc-curso-chip">${c.c} <span>${dias} · ${c.h}h</span></div>`;
    }).join('');
    return `
      <div class="doc-card">
        <div class="doc-card-head">
          <div class="doc-card-nombre">${d.n}</div>
          <div class="doc-card-acciones">
            <button class="btn-icon" onclick="App.editarDocente(${i})" title="Editar">✏️</button>
            <button class="btn-icon danger" onclick="App.quitarDocente(${i})" title="Quitar">🗑</button>
          </div>
        </div>
        <div class="doc-cursos">${cursosTxt || '<span style="color:var(--muted);font-size:12px">Sin cursos</span>'}</div>
      </div>`;
  }).join('');
}

// ── Guardar el valor de hora general ──
export function guardarValorHoraGeneral() {
  const vh = parseInt($('docValorHora').value) || 14000;
  const cfg = getHabCfg();
  cfg.vh = vh;
  saveHabCfg(cfg);
  logA('HABERES', `Cambió valor hora general a ${vh}`);
  alert('✅ Valor de hora guardado');
}

// ── Abrir modal para crear o editar ──
export function nuevoDocente() {
  editIdx = null;
  cursosEdit = [];
  $('mdTitulo').textContent = 'Nuevo docente';
  $('md_nombre').value = '';
  poblarHeredar();
  renderCursosEdit();
  abrir();
}

export function editarDocente(idx) {
  const cfg = getHabCfg();
  const d = cfg.docentes[idx];
  if (!d) return;
  editIdx = idx;
  cursosEdit = JSON.parse(JSON.stringify(d.cursos)); // copia de trabajo
  $('mdTitulo').textContent = 'Editar docente';
  $('md_nombre').value = d.n;
  poblarHeredar();
  renderCursosEdit();
  abrir();
}

// ── Heredar cursos de otro docente ──
function poblarHeredar() {
  const cfg = getHabCfg();
  const sel = $('md_heredar');
  sel.innerHTML = '<option value="">— heredar cursos de… —</option>' +
    cfg.docentes
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i !== editIdx) // no heredar de sí mismo
      .map(({ d, i }) => `<option value="${i}">${d.n} (${d.cursos.length} cursos)</option>`)
      .join('');
}

export function heredarCursos() {
  const idx = $('md_heredar').value;
  if (idx === '') return;
  const cfg = getHabCfg();
  const origen = cfg.docentes[parseInt(idx)];
  if (!origen) return;
  if (cursosEdit.length && !confirm(`¿Reemplazar los cursos actuales por los de ${origen.n}?`)) return;
  cursosEdit = JSON.parse(JSON.stringify(origen.cursos));
  logA('HABERES', `Heredó cursos de ${origen.n}`);
  renderCursosEdit();
  $('md_heredar').value = '';
}

// ── Cursos dentro del modal ──
function renderCursosEdit() {
  const cont = $('md_cursos');
  if (!cursosEdit.length) {
    cont.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin cursos. Agregá uno abajo o heredá de otro docente.</div>';
    return;
  }
  cont.innerHTML = cursosEdit.map((c, i) => `
    <div class="md-curso">
      <div class="md-curso-top">
        <span class="md-curso-nombre">${c.c}</span>
        <button class="btn-icon danger" onclick="App.quitarCursoEdit(${i})" title="Quitar">✕</button>
      </div>
      <div class="md-curso-cfg">
        <div class="md-dias">
          ${DIAS.map(d => `
            <label class="md-dia ${c.ds.includes(d.v) ? 'on' : ''}">
              <input type="checkbox" ${c.ds.includes(d.v) ? 'checked' : ''} onchange="App.toggleDiaCurso(${i},${d.v},this.checked)">
              ${d.n}
            </label>`).join('')}
        </div>
        <div class="md-horas">
          <label>Horas/clase</label>
          <input type="number" value="${c.h}" min="0" step="0.5" onchange="App.setHorasCurso(${i},this.value)">
        </div>
      </div>
    </div>`).join('');
}

export function agregarCursoEdit() {
  const curso = $('md_nuevoCurso').value;
  if (!curso) { alert('Elegí un curso'); return; }
  if (cursosEdit.some(c => c.c === curso)) { alert('Ese curso ya está agregado'); return; }
  cursosEdit.push({ c: curso, ds: [], h: 1 });
  $('md_nuevoCurso').value = '';
  renderCursosEdit();
}

export function quitarCursoEdit(i) {
  cursosEdit.splice(i, 1);
  renderCursosEdit();
}

export function toggleDiaCurso(i, dia, on) {
  if (!cursosEdit[i]) return;
  if (on) {
    if (!cursosEdit[i].ds.includes(dia)) cursosEdit[i].ds.push(dia);
  } else {
    cursosEdit[i].ds = cursosEdit[i].ds.filter(d => d !== dia);
  }
  cursosEdit[i].ds.sort((a, b) => a - b);
  renderCursosEdit();
}

export function setHorasCurso(i, val) {
  if (!cursosEdit[i]) return;
  cursosEdit[i].h = parseFloat(val) || 0;
}

// ── Guardar el docente ──
export function guardarDocente() {
  const nombre = $('md_nombre').value.trim();
  if (!nombre) { alert('Poné el nombre del docente'); return; }

  // Validar que los cursos tengan al menos un día
  const sinDias = cursosEdit.filter(c => !c.ds.length);
  if (sinDias.length) {
    if (!confirm(`${sinDias.length} curso(s) no tienen días marcados y no se van a liquidar. ¿Guardar igual?`)) return;
  }

  const cfg = getHabCfg();

  // Nombre repetido
  const repetido = cfg.docentes.find((d, i) => d.n.toLowerCase() === nombre.toLowerCase() && i !== editIdx);
  if (repetido) { alert('Ya existe un docente con ese nombre'); return; }

  const docente = { n: nombre, cursos: cursosEdit };

  if (editIdx !== null) {
    cfg.docentes[editIdx] = docente;
    logA('HABERES', `Editó al docente ${nombre}`, `${cursosEdit.length} cursos`);
  } else {
    cfg.docentes.push(docente);
    logA('HABERES', `Agregó al docente ${nombre}`, `${cursosEdit.length} cursos`);
  }

  saveHabCfg(cfg);
  cerrar();
  renderDocentes();
}

export function quitarDocente(idx) {
  const cfg = getHabCfg();
  const d = cfg.docentes[idx];
  if (!d) return;
  if (!confirm(`¿Quitar al docente ${d.n}?\n\nSus liquidaciones ya guardadas en los meses no se borran, pero no vas a poder cargarle clases nuevas.`)) return;
  cfg.docentes.splice(idx, 1);
  saveHabCfg(cfg);
  logA('HABERES', `Quitó al docente ${d.n}`);
  renderDocentes();
}

// Helpers de modal
function abrir() { const m = $('modalDocente'); m.classList.add('active'); m.style.display = 'flex'; }
function cerrar() { const m = $('modalDocente'); m.classList.remove('active'); m.style.display = 'none'; }
export function cerrarModalDocente() { cerrar(); }

// Llena el selector de cursos disponibles (una sola vez)
export function initSelectorCursos() {
  const sel = $('md_nuevoCurso');
  if (sel && sel.options.length <= 1) {
    sel.innerHTML = '<option value="">— agregar un curso… —</option>' +
      Object.keys(TARIFAS_BASE).map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

registerPage('docentes', () => { initSelectorCursos(); renderDocentes(); });
