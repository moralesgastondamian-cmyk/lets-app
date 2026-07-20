// ════════════════════════════════════════════════
//  modules/auditoria.js — registro de acciones
// ════════════════════════════════════════════════
import { $ } from '../core/dom.js';
import { KEYS, loadJ, saveJ } from '../core/store.js';
import { FS } from '../core/firebase.js';
import { registerPage } from '../core/router.js';

// Íconos y colores por tipo de acción
const TIPOS = {
  LOGIN:     { icono: '🔑', label: 'Acceso' },
  PAGO:      { icono: '💳', label: 'Pagos' },
  ALUMNO:    { icono: '👥', label: 'Alumnos' },
  TARIFA:    { icono: '💰', label: 'Tarifas' },
  HABERES:   { icono: '👩‍🏫', label: 'Haberes' },
  TALONARIO: { icono: '🖨', label: 'Talonario' },
  RESPALDO:  { icono: '💾', label: 'Respaldo' },
  USUARIO:   { icono: '👤', label: 'Usuarios' },
  ADMIN:     { icono: '⚙️', label: 'Admin' },
};

let registrosNube = [];

export async function renderAuditoria() {
  // Poblar el filtro de tipos la primera vez
  const sel = $('audTipo');
  if (sel && sel.options.length <= 1) {
    sel.innerHTML = '<option value="">Todas las acciones</option>' +
      Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v.icono} ${v.label}</option>`).join('');
  }

  const locales = loadJ(KEYS.AUDIT) || [];
  // Unir local + nube, sin repetir
  const vistos = new Set();
  const todos = [...locales, ...registrosNube].filter(r => {
    const clave = `${r.ts}|${r.u}|${r.desc}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  }).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));

  const fTipo = $('audTipo').value;
  const q = ($('audBuscar').value || '').toLowerCase();

  const filtrados = todos.filter(r => {
    const mt = !fTipo || r.tipo === fTipo;
    const mq = !q || (r.desc || '').toLowerCase().includes(q)
                  || (r.n || '').toLowerCase().includes(q)
                  || (r.u || '').toLowerCase().includes(q)
                  || (r.det || '').toLowerCase().includes(q);
    return mt && mq;
  });

  $('audCount').textContent = `${filtrados.length} registro${filtrados.length !== 1 ? 's' : ''}`;
  const cont = $('auditoriaList');

  if (!filtrados.length) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>Sin registros</div>';
    return;
  }

  cont.innerHTML = filtrados.slice(0, 300).map(r => {
    const t = TIPOS[r.tipo] || { icono: '•', label: r.tipo || '' };
    const fecha = fmtFechaHora(r.ts);
    return `<div class="aud-card">
      <div class="aud-icono">${t.icono}</div>
      <div class="aud-main">
        <div class="aud-desc">${r.desc || ''}</div>
        ${r.det ? `<div class="aud-det">${r.det}</div>` : ''}
        <div class="aud-meta">${r.n || r.u || '—'} · ${fecha}</div>
      </div>
    </div>`;
  }).join('');
}

function fmtFechaHora(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ts; }
}

// Traer los registros que otros dispositivos subieron a la nube
export async function cargarAuditoriaNube() {
  if (!FS) return;
  try {
    const datos = await FS.getAll('auditoria');
    registrosNube = datos.filter(d => d.ts);
    renderAuditoria();
  } catch (e) {
    console.warn('No se pudo leer la auditoría de la nube:', e);
  }
}

export function exportarAuditoria() {
  const locales = loadJ(KEYS.AUDIT) || [];
  const todos = [...locales, ...registrosNube].sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  const h = ['Fecha', 'Usuario', 'Nombre', 'Tipo', 'Acción', 'Detalle'];
  const rows = todos.map(r => [fmtFechaHora(r.ts), r.u || '', r.n || '', r.tipo || '', r.desc || '', r.det || '']);
  const csv = [h, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csv);
  a.download = `lets_auditoria_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

registerPage('auditoria', () => { renderAuditoria(); cargarAuditoriaNube(); });
