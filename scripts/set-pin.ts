import bcrypt from 'bcryptjs';

const pin = process.argv[2];
if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Uso: npx tsx scripts/set-pin.ts <PIN_DE_4_A_8_DIGITOS>');
  console.error('Ejemplo: npx tsx scripts/set-pin.ts 123456');
  process.exit(1);
}

const hash = bcrypt.hashSync(pin, 10);
console.log('\n✅ PIN hasheado correctamente.\n');
console.log('Copiá esta línea a tu .env.local (o Vercel env vars):\n');
console.log(`APP_PIN_HASH=${hash}`);
console.log('');
