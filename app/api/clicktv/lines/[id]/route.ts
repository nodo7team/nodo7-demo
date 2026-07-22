import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as clicktv from '@/lib/platforms/clicktv';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logAction } from '@/lib/db/actions-log';
import { CLICKTV_PACKAGES } from '@/types';
import { generatePassword } from '@/lib/utils/generators';
import { calculateStatus, addMonthsISO } from '@/lib/utils/dates';

const patchSchema = z.object({
  action: z.enum(['renew', 'renew_pass', 'reset_password', 'disable', 'enable']),
  package_id: z.number().int().optional(),
  new_password: z.string().optional(),
});

/** Obtiene una línea de la DB por id (uuid) o external_id */
async function getLineRecord(idOrExternal: string) {
  // Primero por uuid
  let { data } = await supabaseAdmin
    .from('lines')
    .select('*')
    .eq('id', idOrExternal)
    .eq('platform', 'clicktv')
    .maybeSingle();

  if (!data) {
    const res = await supabaseAdmin
      .from('lines')
      .select('*')
      .eq('external_id', idOrExternal)
      .eq('platform', 'clicktv')
      .maybeSingle();
    data = res.data;
  }
  return data;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  const line = await getLineRecord(id);
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  const externalIdNum = parseInt(line.external_id, 10);
  if (isNaN(externalIdNum)) {
    return NextResponse.json({ error: 'external_id inválido' }, { status: 400 });
  }

  try {
    let apiRes: any;
    let newPassword: string | undefined;
    let newExpiry: string | null = line.expires_at;
    let pkg = input.package_id ?? line.package_id;
    const pkgInfo = pkg ? CLICKTV_PACKAGES.find((p) => p.id === pkg) : null;

    if (input.action === 'disable') {
      apiRes = await clicktv.disableLine(externalIdNum);
    } else if (input.action === 'enable') {
      apiRes = await clicktv.enableLine(externalIdNum);
    } else if (input.action === 'renew') {
      if (!pkg) return NextResponse.json({ error: 'package_id requerido' }, { status: 400 });
      apiRes = await clicktv.editLine({ id: externalIdNum, package: pkg });
      if (pkgInfo) newExpiry = addMonthsISO(new Date(), pkgInfo.duration_months);
    } else if (input.action === 'renew_pass') {
      if (!pkg) return NextResponse.json({ error: 'package_id requerido' }, { status: 400 });
      newPassword = input.new_password || generatePassword(8);
      apiRes = await clicktv.editLine({ id: externalIdNum, package: pkg, password: newPassword });
      if (pkgInfo) newExpiry = addMonthsISO(new Date(), pkgInfo.duration_months);
    } else if (input.action === 'reset_password') {
      newPassword = input.new_password || generatePassword(8);
      apiRes = await clicktv.editLine({ id: externalIdNum, password: newPassword });
    }

    const success = !apiRes?._parseError && !apiRes?.error;

    // Actualizar DB local
    const updates: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
    if (newPassword) updates.password = newPassword;
    if (input.action === 'renew' || input.action === 'renew_pass') {
      updates.expires_at = newExpiry;
      updates.package_id = pkg;
      if (pkgInfo) {
        updates.package_label = pkgInfo.name;
        updates.screens = pkgInfo.screens;
      }
      updates.status = calculateStatus(newExpiry);
      updates.is_demo = false; // demo renovada pasa a ser cuenta paga
    }
    if (input.action === 'disable') updates.status = 'blocked';
    if (input.action === 'enable') updates.status = calculateStatus(line.expires_at);

    const { data: updated } = await supabaseAdmin
      .from('lines')
      .update(updates)
      .eq('id', line.id)
      .select()
      .single();

    await logAction({
      action: input.action as any,
      platform: 'clicktv',
      line_id: line.id,
      client_id: line.client_id,
      payload: { ...input, externalId: externalIdNum },
      result: apiRes,
      success,
    });

    return NextResponse.json({ ok: success, line: updated, password: newPassword, raw: apiRes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const line = await getLineRecord(id);
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  const externalIdNum = parseInt(line.external_id, 10);
  if (isNaN(externalIdNum)) {
    return NextResponse.json({ error: 'external_id inválido' }, { status: 400 });
  }

  try {
    const apiRes = await clicktv.deleteLine(externalIdNum);
    const success = !apiRes?.error;

    if (success) {
      await supabaseAdmin.from('lines').delete().eq('id', line.id);
    }

    await logAction({
      action: 'delete',
      platform: 'clicktv',
      line_id: line.id,
      client_id: line.client_id,
      payload: { externalId: externalIdNum, username: line.username },
      result: apiRes,
      success,
    });

    return NextResponse.json({ ok: success, raw: apiRes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
