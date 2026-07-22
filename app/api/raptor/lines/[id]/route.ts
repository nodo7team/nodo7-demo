import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as raptor from '@/lib/platforms/raptor';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logAction } from '@/lib/db/actions-log';
import { addMonthsISO, calculateStatus } from '@/lib/utils/dates';

const patchSchema = z.object({
  action: z.enum(['renew', 'renew_pass', 'reset_password', 'block', 'unblock']),
  months: z.number().int().min(1).optional(),
  new_password: z.string().optional(),
});

async function getLineRecord(idOrEmail: string) {
  const decoded = decodeURIComponent(idOrEmail);

  let { data } = await supabaseAdmin
    .from('lines')
    .select('*')
    .eq('id', decoded)
    .eq('platform', 'raptor')
    .maybeSingle();

  if (!data) {
    const res = await supabaseAdmin
      .from('lines')
      .select('*')
      .eq('external_id', decoded)
      .eq('platform', 'raptor')
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

  const email = line.external_id;
  let apiOk = false;
  let newPassword: string | undefined;
  let newExpiry: string | null = line.expires_at;

  try {
    if (input.action === 'block') {
      apiOk = await raptor.blockAccount(email);
    } else if (input.action === 'unblock') {
      apiOk = await raptor.unblockAccount(email);
    } else if (input.action === 'renew') {
      const months = input.months ?? 1;
      const res = await raptor.renewAccount(email, months);
      apiOk = res.ok;
      if (apiOk) {
        newExpiry = addMonthsISO(line.expires_at || new Date(), months);
      }
    } else if (input.action === 'renew_pass') {
      const months = input.months ?? 1;
      newPassword = input.new_password || '123456';
      const r1 = await raptor.renewAccount(email, months);
      const r2 = await raptor.resetPassword(email, newPassword);
      apiOk = r1.ok && r2;
      if (apiOk) {
        newExpiry = addMonthsISO(line.expires_at || new Date(), months);
      }
    } else if (input.action === 'reset_password') {
      newPassword = input.new_password || '123456';
      apiOk = await raptor.resetPassword(email, newPassword);
    }

    if (!apiOk) {
      await logAction({
        action: input.action === 'block' ? 'disable' : input.action === 'unblock' ? 'enable' : (input.action as any),
        platform: 'raptor',
        line_id: line.id,
        client_id: line.client_id,
        payload: input as any,
        success: false,
        error_message: 'La plataforma Raptor no respondió correctamente',
      });
      return NextResponse.json(
        { error: 'La plataforma no respondió correctamente' },
        { status: 502 }
      );
    }

    const updates: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
    if (input.action === 'block') {
      updates.status = 'blocked';
    } else if (input.action === 'unblock') {
      updates.status = calculateStatus(line.expires_at);
    } else if (input.action === 'renew' || input.action === 'renew_pass') {
      updates.expires_at = newExpiry;
      updates.status = calculateStatus(newExpiry);
      if (newPassword) updates.password = newPassword;
    } else if (input.action === 'reset_password') {
      updates.password = newPassword;
    }

    const { data: updated } = await supabaseAdmin
      .from('lines')
      .update(updates)
      .eq('id', line.id)
      .select()
      .single();

    await logAction({
      action: input.action === 'block' ? 'disable' : input.action === 'unblock' ? 'enable' : (input.action as any),
      platform: 'raptor',
      line_id: line.id,
      client_id: line.client_id,
      payload: input as any,
      success: true,
    });

    return NextResponse.json({ ok: true, line: updated, password: newPassword });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const line = await getLineRecord(id);
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  try {
    const ok = await raptor.deleteAccount(line.external_id);
    if (ok) {
      await supabaseAdmin.from('lines').delete().eq('id', line.id);
    }
    await logAction({
      action: 'delete',
      platform: 'raptor',
      line_id: line.id,
      payload: { email: line.external_id },
      success: ok,
    });
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
