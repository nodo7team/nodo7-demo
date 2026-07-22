/**
 * Utilidades para procesar y parsear notificaciones de cobro y pago de las apps (Mercado Pago, Naranja X, etc.)
 */

export interface ParsedNotification {
  amount: number;
  clientName: string;
  transactionType: 'income' | 'expense';
}

/**
 * Limpia y convierte un string de monto monetario formateado en español (ej: "18.900" o "6.499,38") a un valor numérico flotante.
 */
export function cleanAmount(val: string): number {
  if (!val) return 0;
  // Quitar espacios en blanco
  let clean = val.replace(/\s/g, '');
  
  // Caso de formato con decimales usando comas, ej: "6.499,38" o "6499,38"
  if (clean.includes(',')) {
    // Quitar todos los puntos de miles
    clean = clean.replace(/\./g, '');
    // Cambiar la coma decimal por punto
    clean = clean.replace(/,/g, '.');
  } else {
    // Si no tiene comas, pero sí puntos (ej: "18.900" o "18900")
    // Si hay un punto, y después de ese punto hay exactamente 3 dígitos, o es un punto de miles.
    // Para simplificar, si no hay comas y hay puntos, quitamos todos los puntos
    // excepto si es un decimal con punto directo (ej: "18900.50"), pero las notificaciones en ARS
    // suelen usar comas para centavos o puntos para miles.
    // Asumimos que los puntos son separadores de miles si no hay coma.
    clean = clean.replace(/\./g, '');
  }

  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parsea el texto de una notificación para extraer el monto, el nombre de la persona o entidad y si es un ingreso o un egreso.
 */
export function parseNotification(text: string): ParsedNotification {
  if (!text) {
    return { amount: 0, clientName: 'Desconocido', transactionType: 'income' };
  }

  const trimmed = text.trim();

  // 1. Patrón Ingreso Naranja X / Mercado Pago estándar:
  // "Recibiste $ 18.900 😄 + Ramon Oscar Orozco te envió dinero."
  // "Recibiste $ 6.900 😄 + Ramirez Martin Daniel te envió dinero."
  const incomeRegex = /Recibiste\s*\$\s*([\d\.,\s]+).*?\+\s*(.*?)\s*te envió/i;
  let match = trimmed.match(incomeRegex);
  if (match) {
    return {
      amount: cleanAmount(match[1]),
      clientName: match[2].trim(),
      transactionType: 'income'
    };
  }

  // 2. Patrón Egreso Mercado Pago / Naranja X estándar:
  // "Pagaste a Facebook + Debitamos $ 6.499,38 de tu cuenta."
  // "Pagaste a [Nombre] + Debitamos $ [Monto] de tu cuenta."
  const expenseRegex = /Pagaste\s*a\s*(.*?)\s*\+\s*Debitamos\s*\$\s*([\d\.,\s]+)/i;
  match = trimmed.match(expenseRegex);
  if (match) {
    return {
      amount: cleanAmount(match[2]),
      clientName: match[1].trim(),
      transactionType: 'expense'
    };
  }

  // 3. Fallback genérico para otros Ingresos:
  // "Recibiste $ 18.900" o "Recibiste $18.900 de Ramon Orozco"
  const generalIncomeRegex = /Recibiste\s*\$\s*([\d\.,\s]+)(?:\s*(?:de|😄)\s*(.*))?/i;
  match = trimmed.match(generalIncomeRegex);
  if (match) {
    let clientName = 'Desconocido';
    if (match[2]) {
      // Limpiar texto residual como "+ Ramon te envió dinero"
      clientName = match[2].replace(/^\+\s*/, '').replace(/\s*te envió.*/i, '').trim();
    } else if (trimmed.includes('+')) {
      const parts = trimmed.split('+');
      if (parts[1]) {
        clientName = parts[1].replace(/te envió dinero\.?/i, '').replace(/te envió.*/i, '').trim();
      }
    }
    return {
      amount: cleanAmount(match[1]),
      clientName: clientName || 'Desconocido',
      transactionType: 'income'
    };
  }

  // 4. Fallback genérico para Egresos:
  // "Pagaste $ 6.499,38 a Facebook" o "Enviaste $ 5.000 a Ramon"
  const generalExpenseRegex = /(?:Pagaste|Transferiste|Debitamos|Enviaste|Envío)\s*(?:a\s+)?(.*?)\s*(?:por\s+)?\$\s*([\d\.,\s]+)/i;
  match = trimmed.match(generalExpenseRegex);
  if (match) {
    // Si coincide, ej: "Pagaste a Facebook $ 6.499,38" o similar
    return {
      amount: cleanAmount(match[2]),
      clientName: match[1].trim() || 'Gasto General',
      transactionType: 'expense'
    };
  }

  // Fallback si nada coincide (registramos el monto como 0 pero no rompemos el proceso)
  return {
    amount: 0,
    clientName: 'No parseado',
    transactionType: 'income'
  };
}

/**
 * Genera un hash SHA-256 en formato hexadecimal para usarse como identificador único
 * de una fila de Google Sheets, de forma que sea determinista y evite duplicaciones.
 * Funciona de manera síncrona usando Web Crypto API (disponible en entornos Edge/Node).
 */
export async function generateRowHash(timestamp: string, notification: string, app: string): Promise<string> {
  const inputStr = `${timestamp.trim()}|${notification.trim()}|${app.trim()}`;
  
  // Utilizar crypto global de Node/Edge
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback simple por si se corre en un test local sin Crypto Subtle completo
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}
