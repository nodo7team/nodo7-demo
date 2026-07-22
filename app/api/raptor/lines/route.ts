import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as raptor from '@/lib/platforms/raptor';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logAction } from '@/lib/db/actions-log';
import { addMonthsISO, calculateStatus } from '@/lib/utils/dates';
import { generateRaptorEmail } from '@/lib/utils/generators';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().optional(), // default '123456'
  months: z.number().int().min(1).default(1),
  client_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  try {

    const email = input.email || generateRaptorEmail(input.name);
    const password = input.password || '123456';

    const apiRes = await raptor.createAccount({
      name: input.name,
      email,
      password,
    });

    // Raptor devuelve HTML, no JSON. Detectar éxito básico:
    // si después de crear se puede encontrar en listAccounts → éxito
    let success = apiRes.ok;
    let expiresAt: string | null = null;

    try {
      // Si la cuenta ya existe en el listado, asumimos éxito y obtenemos su fecha
      const accounts = await raptor.listAccounts();
      const found = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (found) {
        success = true;
        expiresAt = found.expires_at;
      } else {
        // Si no aparece en listado pero el POST devolvió 200, calcular fecha estimada
        expiresAt = addMonthsISO(new Date(), input.months);
      }
    } catch {
      expiresAt = addMonthsISO(new Date(), input.months);
    }

    // Si se pidieron más de 1 mes, renovar para completar
    if (success && input.months > 1) {
      try {
        await raptor.renewAccount(email, input.months - 1);
        expiresAt = addMonthsISO(new Date(), input.months);
      } catch (e) {
        console.error('Error renovando después de crear:', e);
      }
    }

    if (!success) {
      await logAction({
        action: 'create_paid',
        platform: 'raptor',
        line_id: null,
        client_id: input.client_id ?? null,
        payload: { name: input.name, email, months: input.months },
        success: false,
        error_message: 'La cuenta no pudo crearse en Raptor',
      });
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta en Raptor' },
        { status: 502 }
      );
    }

    // Guardar en DB solo si tuvo éxito
    const { data: line, error: dbError } = await supabaseAdmin
      .from('lines')
      .upsert(
        {
          platform: 'raptor',
          external_id: email,
          username: email,
          password,
          screens: 3,
          package_label: 'Premium (3 pantallas)',
          expires_at: expiresAt,
          status: calculateStatus(expiresAt),
          client_id: input.client_id ?? null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'platform,external_id' },
      )
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: 'Error guardando en base de datos: ' + dbError.message }, { status: 500 });
    }

    await logAction({
      action: 'create_paid',
      platform: 'raptor',
      line_id: line.id,
      client_id: input.client_id ?? null,
      payload: { name: input.name, email, months: input.months },
      success: true,
    });

    return NextResponse.json({
      ok: true,
      line,
      username: email,
      password,
      expires_at: expiresAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
