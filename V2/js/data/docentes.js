// ════════════════════════════════════════════════
//  data/docentes.js — docentes y asignación de cursos
// ════════════════════════════════════════════════

// Valor de la hora docente
export const VALOR_HORA = 14000;

// Cursos con su docente y carga horaria semanal
export const CURSOS_DOCENTES = [
  { nombre: 'Kinder (Sala de 5)',                    docente: 'Mile',           hs: 2 },
  { nombre: 'Kids 2 (2do grado)',                    docente: 'Camila Carrara', hs: 2 },
  { nombre: 'Kids 3 (3er grado)',                    docente: 'Inés',           hs: 2 },
  { nombre: 'Kids 4 (4to grado)',                    docente: 'Leti',           hs: 4 },
  { nombre: 'Teens 1 (adolescente principiante)',    docente: 'Leti',           hs: 2 },
  { nombre: 'Teens 3 (adolescente pre-intermedio)',  docente: 'Leti',           hs: 4 },
  { nombre: 'Teens 4 (adolescente intermedio)',      docente: 'Pablo',          hs: 2 },
  { nombre: '1st Year (adulto principiante)',        docente: 'Camila Carrara', hs: 2 },
  { nombre: '2nd Year (adulto elemental)',           docente: 'Pablo',          hs: 2 },
  { nombre: '3rd Year (adulto pre-intermedio)',      docente: 'Leti',           hs: 2 },
  { nombre: '4th Year (adulto intermedio)',          docente: 'Pablo',          hs: 2 },
  { nombre: 'C1 Advanced (Cambridge)',               docente: 'Leti',           hs: 2 },
];

// Lista única de docentes
export const DOCENTES = [...new Set(CURSOS_DOCENTES.map(c => c.docente))];

// Horas semanales teóricas por docente (suma de sus cursos)
export function horasSemanalesDocente(docente) {
  return CURSOS_DOCENTES.filter(c => c.docente === docente).reduce((s, c) => s + c.hs, 0);
}
