// ════════════════════════════════════════════════
//  core/router.js — navegación entre pestañas
// ════════════════════════════════════════════════
import { $ } from './dom.js';
import { hA } from './auth.js';

// Definición de pestañas: [id, etiqueta]
const TABS = [
  ['dashboard',    '📊 Dashboard'],
  ['alumnos',      '👥 Alumnos'],
  ['cobrar',       '💳 Registrar Pago'],
  ['historial',    '📋 Historial'],
  ['morosos',      '🔴 Morosos'],
  ['rentabilidad', '📈 Rentabilidad'],
  ['tarifas',      '💰 Tarifas'],
  ['haberes',      '👩‍🏫 Haberes'],
  ['talonario',    '🖨 Talonario'],
  ['respaldo',     '💾 Respaldo'],
  ['auditoria',    '🔍 Auditoría'],
  ['usuarios',     '👤 Usuarios'],
];

// Registro de funciones de render por página (cada módulo registra la suya)
const renderers = {};
export function registerPage(name, renderFn) {
  renderers[name] = renderFn;
}

// Construir las pestañas según permisos del usuario
// Las 4 pestañas de acceso rápido en el celular (el resto va en "Más")
const MOBILE_QUICK = ['dashboard', 'cobrar', 'alumnos', 'historial'];

export function buildTabs() {
  const cont = document.querySelector('.tabs');
  if (!cont) return;

  const permitidas = TABS.filter(([id]) => hA(id));

  // ── Barra de arriba (PC): todas las pestañas ──
  cont.innerHTML = permitidas
    .map(([id, label]) => `<div class="tab" data-page="${id}">${label}</div>`)
    .join('');
  cont.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => showPage(tab.dataset.page));
  });

  // ── Barra de abajo (celular): accesos rápidos + botón "Más" ──
  const mobileBar = document.querySelector('.mobile-tabs');
  if (mobileBar) {
    const quick = permitidas.filter(([id]) => MOBILE_QUICK.includes(id));
    mobileBar.innerHTML = quick
      .map(([id, label]) => `<div class="mtab" data-page="${id}">${label}</div>`)
      .join('') + `<div class="mtab mtab-mas" onclick="App.abrirMenuMas()">☰<span>Más</span></div>`;
    mobileBar.querySelectorAll('.mtab[data-page]').forEach(tab => {
      tab.addEventListener('click', () => { showPage(tab.dataset.page); cerrarMenuMas(); });
    });
  }

  // ── Menú "Más" (celular): el resto de las pestañas ──
  const masMenu = document.querySelector('.mas-menu-list');
  if (masMenu) {
    masMenu.innerHTML = permitidas
      .map(([id, label]) => `<div class="mas-item" data-page="${id}">${label}</div>`)
      .join('');
    masMenu.querySelectorAll('.mas-item').forEach(item => {
      item.addEventListener('click', () => { showPage(item.dataset.page); cerrarMenuMas(); });
    });
  }
}

export function abrirMenuMas() {
  const m = document.querySelector('.mas-menu');
  if (m) { m.classList.add('active'); m.style.display = 'flex'; }
}
export function cerrarMenuMas() {
  const m = document.querySelector('.mas-menu');
  if (m) { m.classList.remove('active'); m.style.display = 'none'; }
}

// Mostrar una página
export function showPage(name) {
  if (!hA(name)) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.mtab').forEach(t => t.classList.toggle('active', t.dataset.page === name));
  document.querySelectorAll('.mas-item').forEach(t => t.classList.toggle('active', t.dataset.page === name));
  const page = $('page-' + name);
  if (page) page.classList.add('active');
  const tab = document.querySelector(`.tab[data-page="${name}"]`);
  if (tab) tab.classList.add('active');
  // Llamar al render del módulo si está registrado
  if (renderers[name]) renderers[name]();
}

// Primera página disponible para el usuario
export function firstPage() {
  const order = ['dashboard','alumnos','cobrar','historial','morosos','rentabilidad','tarifas','haberes','talonario','respaldo','auditoria','usuarios'];
  return order.find(p => hA(p)) || 'cobrar';
}
