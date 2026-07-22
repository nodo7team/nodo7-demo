import { parseNotification, cleanAmount } from '../lib/utils/sales-parser';

const testCases = [
  "Recibiste $ 18.900 😄 + Ramon Oscar Orozco te envió dinero.",
  "Recibiste $ 6.900 😄 + Ramirez Martin Daniel te envió dinero. ",
  "Pagaste a Facebook + Debitamos $ 6.499,38 de tu cuenta. ",
  "Recibiste $ 7.500 😄 + Elizabeth De Los Angel te envió dinero.",
  "Recibiste $ 125.000 😄 + Juan Perez te envió dinero.",
  "Pagaste a Netflix + Debitamos $ 1.999,00 de tu cuenta."
];

console.log("=== PROBANDO PARSER DE NOTIFICACIONES ===\n");

testCases.forEach((tc, idx) => {
  const result = parseNotification(tc);
  console.log(`Caso ${idx + 1}: "${tc.trim()}"`);
  console.log(`-> Tipo: ${result.transactionType.toUpperCase()}`);
  console.log(`-> Monto: $${result.amount} (original: ${tc.match(/\$[\s\d\.,]+/)?.[0]?.trim() || "N/A"})`);
  console.log(`-> Cliente/Detalle: "${result.clientName}"`);
  console.log("-----------------------------------------");
});
