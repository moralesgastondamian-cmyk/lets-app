// ════════════════════════════════════════════════
//  modules/usuarios.js — gestión de usuarios y permisos
// ════════════════════════════════════════════════
import { $ } from '../core/dom.js';
import { state, KEYS, loadJ, saveJ } from '../core/store.js';
import { hp, logA, ACCESOS } from '../core/auth.js';
import { FS } from '../core/firebase.js';
import { registerPage } from '../core/router.js';

let editandoId = null;

// Etiquetas legibles de cada permiso
const ETIQUETAS = {
  dashboard: '📊 Dashboard',
  alumnos: '👥 Alumnos',
  cobrar: '💳 Registrar Pago',
  historial: '📋 Historial',
  morosos: '🔴 Morosos',
  rentabilidad: '📈 Rentabilidad',
  tarifas: '💰 Tarifas',
  haberes: '👩‍🏫 Haberes',
  talonario: '🖨 Talonario',
  respaldo: '💾 Respaldo',
  auditoria: '🔍 Auditoría',
  usuarios: '👤 Usuarios',
  canDelete: '🗑 Puede eliminar pagos',
};

function getUsers() { return loadJ(KEYS.USERS) || []; }

export function renderUsuarios() {
  const users = getUsers();
  const cont = $('usuariosList');

  if (!users.length) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">👤</div>Sin usuarios</div>';
    return;
  }

  cont.innerHTML = users.map(u => {
    const nombre = u.n || u.nombre || '—';
    const usuario = u.u || u.usuario || '—';
    const rol = u.r || u.rol || 'cajero';
    const activo = u.on !== undefined ? u.on : 1;
    const accesos = u.a || u.acc || [];
    const esYo = state.CU && state.CU.id === u.id;

    return `<div class="user-card">
      <div class="user-main">
        <div class="user-nombre">
          ${nombre}
          ${esYo ? '<span class="tag-yo">vos</span>' : ''}
          ${!activo ? '<span class="tag-inactivo">Inactivo</span>' : ''}
        </div>
        <div class="user-datos">@${usuario} · ${rol === 'admin' ? 'Administrador' : 'Cajero'}</div>
        <div class="user-permisos">${accesos.length} permisos</div>
      </div>
      <div class="user-acciones">
        <button class="btn-icon" data-edit-user="${u.id}" title="Editar">✏️</button>
        ${!esYo ? `<button class="btn-icon ${activo ? 'danger' : ''}" data-toggle-user="${u.id}" title="${activo ? 'Desactivar' : 'Activar'}">${activo ? '🚫' : '✅'}</button>` : ''}
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('[data-edit-user]').forEach(b =>
    b.addEventListener('click', () => abrirModalUsuario(b.dataset.editUser)));
  cont.querySelectorAll('[data-toggle-user]').forEach(b =>
    b.addEventListener('click', () => toggleUsuario(b.dataset.toggleUser)));
}

// ── Modal crear / editar ──
export function abrirModalUsuario(id) {
  editandoId = id || null;
  const u = id ? getUsers().find(x => x.id === id) : null;
  $('muTitulo').textContent = u ? 'Editar usuario' : 'Nuevo usuario';

  $('mu_nombre').value = u ? (u.n || u.nombre || '') : '';
  $('mu_usuario').value = u ? (u.u || u.usuario || '') : '';
  $('mu_pass').value = '';
  $('mu_passHint').textContent = u ? 'Dejalo vacío para no cambiar la contraseña' : 'Mínimo 6 caracteres';
  $('mu_rol').value = u ? (u.r || u.rol || 'cajero') : 'cajero';

  // Grilla de permisos
  const accesos = u ? (u.a || u.acc || []) : ['dashboard', 'cobrar', 'historial', 'morosos'];
  $('mu_permisos').innerHTML = ACCESOS.map(p => `
    <label class="perm-item">
      <input type="checkbox" value="${p}" ${accesos.includes(p) ? 'checked' : ''}>
      <span>${ETIQUETAS[p] || p}</span>
    </label>`).join('');

  const m = $('modalUsuario'); m.classList.add('active'); m.style.display = 'flex';
}

export function guardarUsuario() {
  const nombre = $('mu_nombre').value.trim();
  const usuario = $('mu_usuario').value.trim().toLowerCase();
  const pass = $('mu_pass').value.trim();
  const rol = $('mu_rol').value;
  const permisos = [...$('mu_permisos').querySelectorAll('input:checked')].map(c => c.value);

  if (!nombre || !usuario) { alert('Completá nombre y usuario'); return; }
  if (!editandoId && pass.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
  if (pass && pass.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
  if (!permisos.length) { alert('Marcá al menos un permiso'); return; }

  const users = getUsers();

  // Usuario repetido
  const repetido = users.find(x => (x.u || x.usuario || '').toLowerCase() === usuario && x.id !== editandoId);
  if (repetido) { alert('Ya existe un usuario con ese nombre de acceso'); return; }

  if (editandoId) {
    const u = users.find(x => x.id === editandoId);
    if (!u) return;
    u.n = nombre; u.u = usuario; u.r = rol; u.a = permisos;
    if (pass) u.h = hp(pass);
    saveJ(KEYS.USERS, users);
    if (FS) FS.set('usuarios', u.id, u);
    logA('USUARIO', `Editó usuario ${usuario}`, `rol: ${rol}, ${permisos.length} permisos`);
    // Si me edité a mí mismo, actualizo la sesión
    if (state.CU && state.CU.id === u.id) state.CU = u;
  } else {
    const nuevo = {
      id: 'u' + Date.now(),
      n: nombre, u: usuario, h: hp(pass), r: rol, a: permisos, on: 1
    };
    users.push(nuevo);
    saveJ(KEYS.USERS, users);
    if (FS) FS.set('usuarios', nuevo.id, nuevo);
    logA('USUARIO', `Creó usuario ${usuario}`, `rol: ${rol}, ${permisos.length} permisos`);
  }

  cerrarModalUsuario();
  renderUsuarios();
}

export function toggleUsuario(id) {
  const users = getUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  if (state.CU && state.CU.id === id) { alert('No podés desactivar tu propio usuario'); return; }

  const activo = u.on !== undefined ? u.on : 1;
  const nuevoEstado = activo ? 0 : 1;
  if (!confirm(`¿${nuevoEstado ? 'Activar' : 'Desactivar'} a ${u.n || u.u}?`)) return;

  u.on = nuevoEstado;
  saveJ(KEYS.USERS, users);
  if (FS) FS.set('usuarios', u.id, u);
  logA('USUARIO', `${nuevoEstado ? 'Activó' : 'Desactivó'} a ${u.u}`);
  renderUsuarios();
}

export function cerrarModalUsuario() {
  const m = $('modalUsuario'); m.classList.remove('active'); m.style.display = 'none';
  editandoId = null;
}

registerPage('usuarios', renderUsuarios);
