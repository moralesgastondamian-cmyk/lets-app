// ════════════════════════════════════════════════
//  core/dom.js — helpers de uso general
// ════════════════════════════════════════════════

// Atajo para document.getElementById
export const $ = id => document.getElementById(id);

// Formato de moneda argentina
export const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-AR');

// Fecha de hoy en formato YYYY-MM-DD
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Meses del año
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Meses del ciclo lectivo (Marzo a Diciembre)
export const MESES_LECTIVOS = ['Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Días de la semana
export const DNMS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Calcular edad desde fecha de nacimiento
export function calcEdad(nacimiento) {
  if (!nacimiento) return null;
  const n = new Date(nacimiento);
  if (isNaN(n)) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
}

// Formatear fecha YYYY-MM-DD a "Lun 15/03"
export function fmtFecha(s) {
  const [y, m, d] = s.split('-');
  const dow = new Date(parseInt(y), parseInt(m)-1, parseInt(d)).getDay();
  return `${DNMS[dow]} ${d}/${m}`;
}
