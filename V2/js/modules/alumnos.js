// ════════════════════════════════════════════════
//  modules/alumnos.js — Alumnos + Estado de cuenta
// ════════════════════════════════════════════════
import { $, fmt, today, calcEdad, MESES_LECTIVOS } from '../core/dom.js';
import { state } from '../core/store.js';
import { logA, canDelete } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { KEYS, saveJ } from '../core/store.js';
import { rebuildAlumnos } from '../core/data.js';
import { TARIFAS_BASE } from '../data/lista-tarifas.js';
import { registerPage, showPage } from '../core/router.js';

let editingId = null;

// ── Poblar selects de curso ──
function fillCursoSelects() {
  const cursos = Object.keys(TARIFAS_BASE);
  ['ma_curso', 'filtroCurso'].forEach(id => {
    const sel = $(id);
    if (!sel) return;
    const isFiltro = id === 'filtroCurso';
    if (sel.options.length > (isFiltro ? 1 : 0)) return;
    const base = isFiltro ? '<option value="">Todos los cursos</option>' : '';
    sel.innerHTML = base + cursos.map(c => `<option value="${c}">${c}</option>`).join('');
  });
}

// ── Render de la tabla ──
export function renderAlumnos() {
  fillCursoSelects();
  const q = ($('filtroNombre').value || '').toLowerCase();
  const fCurso = $('filtroCurso').value;
  const fEstado = $('filtroEstado').value;
  const fFamiliar = $('filtroFamiliar') ? $('filtroFamiliar').value : '';

  let lista = state.ALUMNOS.filter(a => {
    const mq = !q
      || `${a.apellido} ${a.nombre}`.toLowerCase().includes(q)
      || (a.responsable || '').toLowerCase().includes(q);
    const mFam = fFamiliar === '' || String(a.familiar || 0) === fFamiliar;
    return mq && (!fCurso || a.curso === fCurso) && (!fEstado || a.estado === fEstado) && mFam;
  }).sort((a, b) => a.apellido.localeCompare(b.apellido));

  $('alCount').textContent = `${lista.length} alumno${lista.length !== 1 ? 's' : ''}`;
  const cont = $('alumnosList2');

  if (!lista.length) { cont.innerHTML = '<div class="empty-state"><div class="icon">👥</div>Sin alumnos</div>'; return; }

  cont.innerHTML = lista.map(a => {
    const edad = calcEdad(a.nacimiento);
    const bonif = a.bonif_tipo && a.bonif_tipo !== 'ninguna'
      ? `<span class="tag-bonif">${a.bonif_tipo === 'beca' ? 'BECA' : a.bonif_tipo === 'porc' ? a.bonif_val + '%' : fmt(a.bonif_val)}</span>` : '';
    const inactivo = a.estado !== 'Activo'
      ? `<span class="tag-inactivo">Inactivo</span>` : '';
    return `<div class="al-card">
      <div class="al-card-main">
        <div class="al-card-nombre">${a.apellido}, ${a.nombre} ${bonif} ${inactivo}</div>
        <div class="al-card-curso">${a.curso}</div>
        <div class="al-card-meta">${a.responsable || ''}${edad !== null ? ' · ' + edad + ' años' : ''}${a.familiar ? ' · 🏷 familiar' : ''}</div>
      </div>
      <div class="al-card-acciones">
        <button class="btn-icon" data-ver="${a.id}" title="Ver ficha">👁</button>
        <button class="btn-icon" data-estado="${a.id}" title="Estado de cuenta">📊</button>
        <button class="btn-icon" data-edit="${a.id}" title="Editar">✏️</button>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => verFicha(parseInt(b.dataset.ver))));
  cont.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => estadoCuenta(parseInt(b.dataset.estado))));
  cont.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => abrirModalAlumno(parseInt(b.dataset.edit))));
}

// ── Ver ficha completa (vista rápida) ──
export function verFicha(id) {
  const a = state.ALUMNOS.find(x => x.id === id);
  if (!a) return;
  const edad = calcEdad(a.nacimiento);
  const bonifTxt = a.bonif_tipo && a.bonif_tipo !== 'ninguna'
    ? (a.bonif_tipo === 'beca' ? 'Beca 100%' : a.bonif_tipo === 'porc' ? a.bonif_val + '%' : fmt(a.bonif_val)) + ' — ' + (a.bonif_aplica === 'ambos' ? 'cuota y matrícula' : a.bonif_aplica === 'cuota' ? 'solo cuotas' : 'solo matrícula')
    : 'Sin bonificación';
  $('vfTitulo').textContent = `${a.apellido}, ${a.nombre}`;
  const row = (label, val) => val ? `<div class="vf-row"><span>${label}</span><strong>${val}</strong></div>` : '';
  $('vfContent').innerHTML = `
    ${row('Curso', a.curso)}
    ${row('Estado', a.estado)}
    ${row('Responsable', a.responsable)}
    ${row('Celular', a.celular)}
    ${row('Horario', a.horario)}
    ${row('Nacimiento', a.nacimiento ? a.nacimiento + (edad !== null ? ` (${edad} años)` : '') : '')}
    ${row('Descuento familiar', a.familiar ? 'Sí (5%)' : 'No')}
    ${row('Bonificación', bonifTxt)}
    ${row('Inscripción', a.fecha)}
    ${a.obs ? row('Observaciones', a.obs) : ''}
    <div class="vf-actions">
      <button class="btn btn-ghost btn-sm" onclick="App.estadoCuentaDesdeFicha(${a.id})">📊 Estado de cuenta</button>
      <button class="btn btn-primary btn-sm" onclick="App.editarDesdeFicha(${a.id})">✏️ Editar</button>
    </div>`;
  const m = $('modalVerFicha'); m.classList.add('active'); m.style.display = 'flex';
}
export function cerrarFicha() { const m = $('modalVerFicha'); m.classList.remove('active'); m.style.display = 'none'; }
export function estadoCuentaDesdeFicha(id) { cerrarFicha(); estadoCuenta(id); }
export function editarDesdeFicha(id) { cerrarFicha(); abrirModalAlumno(id); }

// ── Estado de cuenta (modal con meses clickeables) ──
export function estadoCuenta(id) {
  const a = state.ALUMNOS.find(x => x.id === id);
  if (!a) return;
  const pagosA = state.pagos.filter(p => p.alumnoId === id);
  $('ecTitulo').textContent = `📊 ${a.apellido}, ${a.nombre}`;

  const matricula = pagosA.find(p => p.concepto === 'Matrícula 2026');
  const cuotas = {};
  pagosA.filter(p => p.concepto === 'Cuota mensual').forEach(p => { cuotas[p.mes] = p; });

  const matCard = matricula
    ? `<div class="ec-mat ok"><div><div class="ec-mat-t">Matrícula 2026</div><div class="ec-mat-s">${matricula.forma === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'} · ${matricula.fecha}</div></div><div class="ec-mat-v">${fmt(matricula.total)} ✓</div></div>`
    : `<div class="ec-mat pend" data-cobrar="matricula"><div><div class="ec-mat-t">Matrícula 2026</div><div class="ec-mat-s">Tocá para registrar</div></div><div class="ec-mat-v">Pendiente ✗</div></div>`;

  const grid = MESES_LECTIVOS.map(mes => {
    const p = cuotas[mes];
    if (p) {
      const cls = p.forma === 'efectivo' ? 'ef' : 'tr';
      const ic = p.forma === 'efectivo' ? '💵' : '🏦';
      return `<div class="ec-mes ${cls}" data-recibo="${p.id}"><div class="ec-mes-n">${mes.substring(0, 3)}</div><div class="ec-mes-ic">✓</div><div class="ec-mes-v">${ic} ${fmt(p.total)}</div></div>`;
    }
    return `<div class="ec-mes pend" data-cobrar="cuota" data-mes="${mes}"><div class="ec-mes-n">${mes.substring(0, 3)}</div><div class="ec-mes-ic">+</div><div class="ec-mes-v">cobrar</div></div>`;
  }).join('');

  const pagados = Object.keys(cuotas).length;
  const totalA = pagosA.reduce((s, p) => s + p.total, 0);

  $('ecContent').innerHTML = `
    <div style="margin-bottom:14px">${matCard}</div>
    <div class="section-label">Cuotas mensuales — tocá un mes para cobrar</div>
    <div class="ec-grid">${grid}</div>
    <div class="ec-resumen"><div><span class="ec-big">${pagados}</span><span class="ec-small">/10 cuotas</span></div><div style="text-align:right"><div class="ec-small">Total abonado</div><div class="ec-big">${fmt(totalA)}</div></div></div>`;

  // Eventos
  $('ecContent').querySelectorAll('[data-recibo]').forEach(el => el.addEventListener('click', () => { closeEC(); }));
  $('ecContent').querySelectorAll('[data-cobrar]').forEach(el => el.addEventListener('click', () => {
    closeEC();
    showPage('cobrar');
    setTimeout(() => {
      if (window.App && window.App.selectAlumnoById) window.App.selectAlumnoById(a.id, el.dataset.cobrar, el.dataset.mes || '');
    }, 150);
  }));

  const m = $('modalEstadoCuenta'); m.classList.add('active'); m.style.display = 'flex';
}
function closeEC() { const m = $('modalEstadoCuenta'); m.classList.remove('active'); m.style.display = 'none'; }

// ── Modal editar/crear alumno ──
export function abrirModalAlumno(id) {
  fillCursoSelects();
  editingId = id || null;
  $('maTitulo').textContent = id ? 'Editar alumno' : 'Nuevo alumno';
  const a = id ? state.ALUMNOS.find(x => x.id === id) : null;
  const v = (k, d = '') => a ? (a[k] ?? d) : d;
  $('ma_apellido').value = v('apellido');
  $('ma_apellido2').value = v('apellido2');
  $('ma_nombre').value = v('nombre');
  $('ma_curso').value = v('curso', Object.keys(TARIFAS_BASE)[0]);
  $('ma_responsable').value = v('responsable');
  $('ma_celular').value = v('celular');
  $('ma_horario').value = v('horario');
  $('ma_nacimiento').value = v('nacimiento');
  $('ma_estado').value = v('estado', 'Activo');
  $('ma_familiar').value = String(v('familiar', 0));
  $('ma_bonif_tipo').value = v('bonif_tipo', 'ninguna');
  $('ma_bonif_val').value = v('bonif_val', '');
  $('ma_bonif_aplica').value = v('bonif_aplica', 'ambos');
  $('ma_obs').value = v('obs');
  toggleBonifVal();
  const m = $('modalAlumno'); m.classList.add('active'); m.style.display = 'flex';
}
export function toggleBonifVal() {
  const t = $('ma_bonif_tipo').value;
  $('ma_bonif_val').style.display = (t === 'ninguna' || t === 'beca') ? 'none' : 'block';
  $('ma_bonif_aplica').style.display = t === 'ninguna' ? 'none' : 'block';
}
export function guardarAlumno() {
  const ap = $('ma_apellido').value.trim();
  const nm = $('ma_nombre').value.trim();
  const cr = $('ma_curso').value;
  const rs = $('ma_responsable').value.trim();
  if (!ap || !nm || !cr || !rs) { alert('Completá los campos obligatorios (*)'); return; }

  // Calcular próximo ID si es nuevo
  let nextId = editingId;
  if (!nextId) {
    const maxId = state.ALUMNOS.reduce((m, a) => Math.max(m, a.id), 0);
    nextId = maxId + 1;
  }

  const alumno = {
    id: nextId,
    apellido: ap, apellido2: $('ma_apellido2').value.trim(),
    nombre: nm, curso: cr, responsable: rs,
    celular: $('ma_celular').value.trim(), horario: $('ma_horario').value.trim(),
    fecha: $('ma_fecha') ? ($('ma_fecha').value || today()) : today(),
    nacimiento: $('ma_nacimiento').value || '',
    estado: $('ma_estado').value, familiar: parseInt($('ma_familiar').value),
    bonif_tipo: $('ma_bonif_tipo').value || 'ninguna',
    bonif_val: parseFloat($('ma_bonif_val').value) || 0,
    bonif_aplica: $('ma_bonif_aplica').value || 'ambos',
    obs: $('ma_obs').value.trim()
  };

  // Actualizar lista custom
  const idx = state.alumnosCustom.findIndex(x => x.id === nextId);
  if (idx >= 0) state.alumnosCustom[idx] = alumno;
  else state.alumnosCustom.push(alumno);
  saveJ(KEYS.ALUMNOS, state.alumnosCustom);
  if (FS) FS.set('alumnos_custom', String(alumno.id), alumno);
  rebuildAlumnos();

  logA('ALUMNO', editingId ? `Editó alumno: ${ap}, ${nm}` : `Creó alumno: ${ap}, ${nm}`);
  const m = $('modalAlumno'); m.classList.remove('active'); m.style.display = 'none';
  renderAlumnos();
}

registerPage('alumnos', renderAlumnos);
