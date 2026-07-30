// ════════════════════════════════════════════════
//  core/store.js — localStorage + estado compartido
// ════════════════════════════════════════════════

// ── Claves de localStorage ──
export const KEYS = {
  PAGOS:        'lets_pagos_2026',
  ALUMNOS:      'lets_alumnos_custom_2026',
  TARIFAS_MAYO: 'lets_tarifas_mayo',
  TARIFAS_MES:  'lets_tarifas_mes_2026',
  RENT:         'lets_rentabilidad_2026',
  HAB:          'lets_haberes_2026',
  HAB_CFG:      'lets_habcfg_2026',
  USERS:        'lets_users_2026',
  SESS:         'lets_sess_2026',
  AUDIT:        'lets_audit_2026',
};

// ── Helpers de localStorage ──
export function loadJ(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch (e) { return null; }
}
export function saveJ(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

// ── Estado compartido de la app ──
// Usamos un objeto contenedor para que los módulos compartan la misma referencia
export const state = {
  CU: null,           // usuario actual (current user)
  pagos: [],          // todos los pagos
  alumnosCustom: [],  // alumnos agregados/editados
  ALUMNOS: [],        // lista completa (base + custom)
  tarifasMayo: {},    // tarifas actualizadas (modelo viejo, compat)
  tarifasMes: {},     // tarifas por mes: { Marzo:{...}, Abril:{...}, ... }
  rentData: {},       // datos de rentabilidad
  pagoCounter: 1001,  // próximo número de recibo
};
