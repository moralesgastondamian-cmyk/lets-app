// ════════════════════════════════════════════════
//  data/autorizados.js — mails de Gmail que pueden entrar
// ════════════════════════════════════════════════
// Para agregar o sacar personas: editá esta lista y volvé a subir el archivo.
// El mail debe estar en minúsculas.
// - rol 'admin'  → acceso total
// - rol 'cajero' → dashboard, cobrar, historial, morosos
//
// Ojo: estar en esta lista NO le da acceso a nadie por sí solo;
// además tiene que iniciar sesión con la cuenta de Google real de ese mail.

export const AUTORIZADOS = [
  { email: 'moralesgastondamian@gmail.com', nombre: 'Administrador',  rol: 'admin' },
  { email: 'leticiarivera07@gmail.com',     nombre: 'Administradora', rol: 'admin' },
];

// Busca un mail en la lista (ignora mayúsculas y espacios). Devuelve el registro o null.
export function buscarAutorizado(email) {
  if (!email) return null;
  const limpio = String(email).trim().toLowerCase();
  return AUTORIZADOS.find(a => a.email.toLowerCase() === limpio) || null;
}
