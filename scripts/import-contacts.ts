/**
 * Importa contactos desde un archivo JSON a Supabase.
 * 
 * Uso: npx tsx scripts/import-contacts.ts <ruta_al_json>
 * 
 * Formato esperado del JSON:
 * [
 *   { "name": "Juan", "phone": "+5492974601012", "username": "juantv123", "platform": "clicktv" },
 *   ...
 * ]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  console.error('Ejecutá con: dotenv -- npx tsx scripts/import-contacts.ts contacts.json');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('❌ Pasá la ruta al archivo JSON como argumento.');
  console.error('Ejemplo: npx tsx scripts/import-contacts.ts ./contacts.json');
  process.exit(1);
}

interface ContactEntry {
  name?: string;
  phone?: string;
  username?: string;
  platform?: 'clicktv' | 'raptor';
  notes?: string;
}

async function run() {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const contacts: ContactEntry[] = JSON.parse(raw);

  console.log(`\n📋 Importando ${contacts.length} contactos...\n`);

  let imported = 0;
  let linked = 0;
  let errors = 0;

  for (const c of contacts) {
    try {
      // 1) Crear o encontrar cliente por teléfono
      let clientId: string | null = null;

      if (c.phone) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', c.phone)
          .maybeSingle();

        if (existing) {
          clientId = existing.id;
        } else {
          const { data: created } = await supabase
            .from('clients')
            .insert({ name: c.name || null, phone: c.phone, notes: c.notes || null })
            .select('id')
            .single();
          clientId = created?.id ?? null;
          if (clientId) imported++;
        }
      }

      // 2) Vincular a línea existente si hay username + platform
      if (clientId && c.username && c.platform) {
        const field = c.platform === 'clicktv' ? 'username' : 'external_id';
        const { error } = await supabase
          .from('lines')
          .update({ client_id: clientId })
          .eq('platform', c.platform)
          .eq(field, c.username);

        if (!error) linked++;
      }
    } catch (e: any) {
      console.error(`  ❌ Error con ${c.name || c.phone}: ${e.message}`);
      errors++;
    }
  }

  console.log(`✅ Clientes creados: ${imported}`);
  console.log(`🔗 Líneas vinculadas: ${linked}`);
  if (errors) console.log(`❌ Errores: ${errors}`);
  console.log('');
}

run().catch(console.error);
