// ════════════════════════════════════════════════
//  data/lista-tarifas.js — tarifas y función central getTarifa
// ════════════════════════════════════════════════
import { KEYS, loadJ, state } from '../core/store.js';

export const TARIFAS_BASE = {
  'Kinder (Sala de 5)':                           {matricula:40000,transferencia:40000,efectivo:36000},
  'Kids 1 (1er grado)':                           {matricula:40000,transferencia:45000,efectivo:40000},
  'Kids 2 (2do grado)':                           {matricula:40000,transferencia:45000,efectivo:40000},
  'Kids 3 (3er grado)':                           {matricula:40000,transferencia:45000,efectivo:40000},
  'Kids 4 (4to grado)':                           {matricula:40000,transferencia:45000,efectivo:40000},
  'Kids 5 (5to grado)':                           {matricula:40000,transferencia:45000,efectivo:40000},
  'Teens 1 (adolescente principiante)':           {matricula:50000,transferencia:50000,efectivo:45000},
  'Teens 2 (adolescente elemental)':              {matricula:50000,transferencia:50000,efectivo:45000},
  'Teens 3 (adolescente pre-intermedio)':         {matricula:50000,transferencia:50000,efectivo:45000},
  'Teens 4 (adolescente intermedio)':             {matricula:50000,transferencia:50000,efectivo:45000},
  '1st Year (adulto principiante)':               {matricula:50000,transferencia:50000,efectivo:45000},
  '2nd Year (adulto elemental)':                  {matricula:50000,transferencia:50000,efectivo:45000},
  '3rd Year (adulto pre-intermedio)':             {matricula:50000,transferencia:50000,efectivo:45000},
  '4th Year (adulto intermedio)':                 {matricula:50000,transferencia:50000,efectivo:45000},
  '5th Year (adulto avanzado)':                   {matricula:50000,transferencia:50000,efectivo:45000},
  '6th Year (adulto avanzado)':                   {matricula:50000,transferencia:50000,efectivo:45000},
  'B2 First (Examen Internacional Cambridge)':    {matricula:60000,transferencia:65000,efectivo:60000},
  'C1 Advanced (Examen Internacional Cambridge)': {matricula:60000,transferencia:65000,efectivo:60000},
  'Conversation (Nivel Intermedio +)':            {matricula:60000,transferencia:65000,efectivo:60000},
  'INTENSIVO 4 HS SEMANALES 1st & 2nd Year':     {matricula:50000,transferencia:50000,efectivo:45000},
};

// Meses que usan la tarifa actualizada (Mayo en adelante)
export const MESES_TARIFA = ['Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Compatibilidad hacia atrás (algunos módulos aún lo importan)
export const MESES_TARIFA_NUEVA = ['Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export function usaTarifaNueva(mes) { return MESES_TARIFA_NUEVA.includes(mes); }

// Devuelve el set de tarifas para un mes puntual.
// state.tarifasMes = { Marzo:{...}, Abril:{...}, ... } — una tabla por mes.
// Si un mes no tiene tabla cargada, hereda del mes anterior que sí tenga, y si
// ninguno tiene, cae a la tarifa base. Así los meses no configurados siguen andando.
export function getTarifasMes(mes) {
  const porMes = state.tarifasMes || {};
  if (porMes[mes] && Object.keys(porMes[mes]).length) return porMes[mes];

  // Heredar del mes anterior configurado (hacia atrás en el calendario)
  const idx = MESES_TARIFA.indexOf(mes);
  for (let i = idx - 1; i >= 0; i--) {
    const m = MESES_TARIFA[i];
    if (porMes[m] && Object.keys(porMes[m]).length) return porMes[m];
  }
  // Compatibilidad: si venías del modelo viejo con tarifasMayo
  if (state.tarifasMayo && usaTarifaNueva(mes) && Object.keys(state.tarifasMayo).length) {
    return state.tarifasMayo;
  }
  return TARIFAS_BASE;
}

// Búsqueda central de tarifa con matching flexible
export function getTarifa(curso, mes) {
  const tarifas = getTarifasMes(mes);
  if (tarifas[curso]) return tarifas[curso];
  const cursoNorm = curso.trim().toLowerCase();
  const keys = Object.keys(tarifas);
  let found = keys.find(k => k.trim().toLowerCase() === cursoNorm);
  if (found) return tarifas[found];
  found = keys.find(k => k.toLowerCase().startsWith(cursoNorm) || cursoNorm.startsWith(k.toLowerCase()));
  if (found) return tarifas[found];
  const pp = cursoNorm.split(' ')[0] + (cursoNorm.split(' ')[1] || '');
  found = keys.find(k => (k.split(' ')[0] + (k.split(' ')[1] || '')).toLowerCase() === pp);
  if (found) return tarifas[found];
  console.warn('Tarifa no encontrada:', curso, '— usando fallback');
  return Object.values(tarifas)[0];
}
