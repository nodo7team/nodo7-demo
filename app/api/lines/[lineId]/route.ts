import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { z } from 'zod';
import * as clicktv from '@/lib/platforms/clicktv';
import * as raptor from '@/lib/platforms/raptor';
import { logAction } from '@/lib/db/actions-log';
import { calculateStatus } from '@/lib/utils/dates';

const updateSchema = z.object({
  username:      z.string().min(2).optional(),
  password:      z.string().min(1).nullable().optional(),
  screens:       z.number().int().min(1).max(20).optional(),
  package_id:    z.number().int().nullable().optional(),
  package_label: z.string().nullable().optional(),
  expires_at:    z.string().nullable().optional(),  // ISO timestamp
  status:        z.enum(['active', 'expiring', 'expired', 'blocked', 'demo']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  const { lineId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  // ── Traer línea actual ────────────────────────────────────────
  const { data: line } = await supabaseAdmin
    .from('lines')
    .select('*')
    .eq('id', lineId)
    .single();

  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  const syncedFields: string[] = [];
  const syncWarnings: string[] = [];

  // ── Sincronizar a la plataforma ───────────────────────────────
  try {
    if (line.platform === 'clicktv') {
      const externalId = parseInt(line.external_id, 10);

      if (!isNaN(externalId)) {
        // username y/o password → edit_line
        const editPayload: Parameters<typeof clicktv.editLine>[0] = { id: externalId };
        let needsEdit = false;

        if (updates.username !== undefined && updates.username !== line.username) {
          editPayload.username = updates.username;
          needsEdit = true;
        }
        if (updates.password !== undefined && updates.password !== line.password) {
          editPayload.password = updates.password ?? undefined;
          needsEdit = true;
        }

        if (needsEdit) {
          const res = await clicktv.editLine(editPayload);
          const ok = !res?._parseError && !res?.error;
          if (ok) {
            if (editPayload.username) syncedFields.push('usuario');
            if (editPayload.password) syncedFields.push('contraseña');
          } else {
            syncWarnings.push('ClickTV: no se pudo actualizar usuario/contraseña en la plataforma');
          }
        }

        // status → disable/enable
        if (updates.status !== undefined && updates.status !== line.status) {
          if (updates.status === 'blocked' && line.status !== 'blocked') {
            await clicktv.disableLine(externalId);
            syncedFields.push('estado (bloqueada)');
          } else if (updates.status !== 'blocked' && line.status === 'blocked') {
            await clicktv.enableLine(externalId);
            syncedFields.push('estado (desbloqueada)');
          }
        }
      }
    } else if (line.platform === 'raptor') {
      const email = line.external_id;

      // password → edituser.php
      if (updates.password !== undefined && updates.password && updates.password !== line.password) {
        const ok = await raptor.resetPassword(email, updates.password);
        if (ok) {
          syncedFields.push('contraseña');
        } else {
          syncWarnings.push('Raptor: no se pudo actualizar la contraseña en la plataforma');
        }
      }

      // status → bloquearuser.php
      if (updates.status !== undefined && updates.status !== line.status) {
        if (updates.status === 'blocked' && line.status !== 'blocked') {
          const ok = await raptor.blockAccount(email);
          if (ok) syncedFields.push('estado (bloqueada)');
          else syncWarnings.push('Raptor: no se pudo bloquear la cuenta en la plataforma');
        } else if (updates.status !== 'blocked' && line.status === 'blocked') {
          const ok = await raptor.unblockAccount(email);
          if (ok) syncedFields.push('estado (desbloqueada)');
          else syncWarnings.push('Raptor: no se pudo desbloquear la cuenta en la plataforma');
        }
      }
    }
  } catch (e: any) {
    syncWarnings.push(`Error de sincronización: ${e?.message ?? 'desconocido'}`);
  }

  // ── Guardar en DB local ───────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('lines')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', lineId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Log ───────────────────────────────────────────────────────
  if (syncedFields.length > 0) {
    await logAction({
      action: 'sync',
      platform: line.platform,
      line_id: line.id,
      client_id: line.client_id ?? null,
      payload: { edited_fields: Object.keys(updates), synced_fields: syncedFields },
      result: undefined,
      success: true,
    }).catch(() => {});
  }

  return NextResponse.json({
    line: data,
    syncedFields,
    syncWarnings,
  });
}
