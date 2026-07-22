import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as clicktv from '@/lib/platforms/clicktv';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logAction } from '@/lib/db/actions-log';
import { CLICKTV_PACKAGES } from '@/types';
import { generatePassword, generateUsername } from '@/lib/utils/generators';
import { calculateStatus, addMonthsISO } from '@/lib/utils/dates';

const schema = z.object({
  package_id: z.number().int(),
  username: z.string().optional(),
  password: z.string().optional(),
  is_trial: z.boolean().optional(),
  client_id: z.string().uuid().nullable().optional(),
  name_hint: z.string().optional(), // para auto-generar username
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

    const pkg = CLICKTV_PACKAGES.find((p) => p.id === input.package_id);
    if (!pkg) {
      return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 });
    }

    const isTrial = input.is_trial ?? pkg.is_trial;
    const username = input.username || generateUsername(input.name_hint || 'cliente');
    const password = input.password || generatePassword(8);

    // Crear en ClickTV
    const apiRes = await clicktv.createLine({
      package: input.package_id,
      username,
      password,
      trial: isTrial ? 1 : 0,
    });

    if (apiRes?._parseError || apiRes?.result === false || apiRes?.error) {
      await logAction({
        action: isTrial ? 'create_demo' : 'create_paid',
        platform: 'clicktv',
        payload: { ...input, username, password },
        result: apiRes,
        success: false,
        error_message: apiRes?.error || apiRes?.message || 'Error desconocido',
      });
      return NextResponse.json(
        { error: apiRes?.error || apiRes?.message || 'Error al crear línea', raw: apiRes },
        { status: 502 },
      );
    }

    // Extraer datos creados
    const externalId = String(apiRes?.id ?? apiRes?.data?.id ?? apiRes?.line_id ?? '');
    const realUsername = apiRes?.username ?? apiRes?.data?.username ?? username;
    const realPassword = apiRes?.password ?? apiRes?.data?.password ?? password;
    const expDate = clicktv.parseExpDate(apiRes?.exp_date ?? apiRes?.data?.exp_date);
    const expiresAt = expDate || (isTrial ? null : addMonthsISO(new Date(), pkg.duration_months));

    const status = isTrial ? 'demo' : calculateStatus(expiresAt);

    // Guardar en DB local
    const { data: line, error: dbError } = await supabaseAdmin
      .from('lines')
      .upsert(
        {
          platform: 'clicktv',
          external_id: externalId || `manual_${Date.now()}`,
          username: realUsername,
          password: realPassword,
          screens: pkg.screens,
          package_id: pkg.id,
          package_label: pkg.name,
          expires_at: expiresAt,
          status,
          is_demo: isTrial,
          client_id: input.client_id ?? null,
          last_synced_at: new Date().toISOString(),
          synced_data: apiRes as any,
        },
        { onConflict: 'platform,external_id' },
      )
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: 'Error guardando en base de datos: ' + dbError.message },
        { status: 500 }
      );
    }

    await logAction({
      action: isTrial ? 'create_demo' : 'create_paid',
      platform: 'clicktv',
      line_id: line!.id,
      client_id: input.client_id ?? null,
      payload: { package_id: pkg.id, username: realUsername },
      result: apiRes,
      success: true,
    });

    return NextResponse.json({
      ok: true,
      line,
      username: realUsername,
      password: realPassword,
      expires_at: expiresAt,
      package: pkg,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
