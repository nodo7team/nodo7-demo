// ─────────────────────────────────────────────────────────
// Generadores de username y password
// Reglas de la doc:
// - Username ClickTV: minúsculas, sin espacios/guiones
// - Password ClickTV: aleatoria minúsculas, sin l/i/j/o/0
// - Username Raptor: email (@gmail.com)
// - Password Raptor: SIEMPRE 123456
// ─────────────────────────────────────────────────────────

const SAFE_CHARS = 'abcdefghkmnpqrstuvwxyz23456789'; // sin l, i, j, o, 0, 1

/** Genera contraseña aleatoria sin caracteres ambiguos */
export function generatePassword(length = 8): string {
  let pass = '';
  const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      pass += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      pass += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
    }
  }
  return pass;
}

/** Limpia un nombre para usar como base de username */
export function sanitizeNameForUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]/g, '');
}

/** Genera username formato {nombre}tv{numero} */
export function generateUsername(name: string, number?: number): string {
  const base = sanitizeNameForUsername(name) || 'cliente';
  const num = number ?? Math.floor(100 + Math.random() * 900);
  return `${base}tv${num}`;
}

/** Genera email para Raptor */
export function generateRaptorEmail(name: string, number?: number): string {
  const base = sanitizeNameForUsername(name) || 'cliente';
  const num = number ?? Math.floor(100 + Math.random() * 900);
  return `${base}tv${num}@gmail.com`;
}

/** Próximo cuentapre según tipo (mensual/trimestral/anual) */
export function nextCuentapre(
  type: 'monthly' | 'quarterly' | 'yearly',
  lastNumber: number,
): string {
  const next = lastNumber + 1;
  switch (type) {
    case 'monthly':
      return `cuentapre${next}`;
    case 'quarterly':
      return `cuentapret${next}`;
    case 'yearly':
      return `cuentaprea${next}`;
  }
}
