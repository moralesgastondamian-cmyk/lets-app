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
];

// Registro de funciones de render por página (cada módulo registra la suya)
const renderers = {};
export function registerPage(name, renderFn) {
  renderers[name] = renderFn;
}

// Construir las pestañas según permisos del usuario
export function buildTabs() {
  const cont = document.querySelector('.tabs');
  if (!cont) return;
  cont.innerHTML = TABS
    .filter(([id]) => hA(id))
    .map(([id, label]) => `<div class="tab" data-page="${id}">${label}</div>`)
    .join('');
  // Eventos de click
  cont.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => showPage(tab.dataset.page));
  });
}

// Mostrar una página
export function showPage(name) {
  if (!hA(name)) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const page = $('page-' + name);
  if (page) page.classList.add('active');
  const tab = document.querySelector(`.tab[data-page="${name}"]`);
  if (tab) tab.classList.add('active');
  // Llamar al render del módulo si está registrado
  if (renderers[name]) renderers[name]();
}

// Primera página disponible para el usuario
export function firstPage() {
  const order = ['dashboard','alumnos','cobrar','historial','morosos','rentabilidad','tarifas','haberes','talonario'];
  return order.find(p => hA(p)) || 'cobrar';
}
