// ════════════════════════════════════════════════════════════════
// Sincronización ClickTV / Raptor → Supabase
// ════════════════════════════════════════════════════════════════

import { supabaseAdmin } from '@/lib/db/supabase';
import * as clicktv from '@/lib/platforms/clicktv';
import * as raptor from '@/lib/platforms/raptor';
import { calculateStatus } from '@/lib/utils/dates';
import { packageLabel } from '@/lib/platforms/clicktv';

export interface SyncResult {
  clicktv: {
    fetched: number;
    upserted: number;
    error?: string;
  };
  raptor: {
    fetched: number;
    upserted: number;
    error?: string;
  };
  duration_ms: number;
}

export async function syncAll(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    clicktv: { fetched: 0, upserted: 0 },
    raptor: { fetched: 0, upserted: 0 },
    duration_ms: 0,
  };

  // ── ClickTV ──
  try {
    const lines = await clicktv.listAllLines();
    result.clicktv.fetched = lines.length;
    const now = new Date().toISOString();

    // Pre-cargar is_demo desde nuestra DB para no depender del campo is_trial del API,
    // que devuelve valores poco confiables (muchas cuentas pagas aparecen como demo).
    const { data: existingLines } = await supabaseAdmin
      .from('lines')
      .select('external_id, is_demo')
      .eq('platform', 'clicktv');

    const isDemoMap = new Map<string, boolean>(
      (existingLines ?? []).map((l) => [l.external_id, l.is_demo]),
    );

    for (const line of lines) {
      const expiresAt = clicktv.parseExpDate(line.exp_date);
      // Usar is_demo de nuestra DB; false para líneas nuevas no creadas por el panel
      const isDemo = isDemoMap.get(String(line.id)) ?? false;
      const enabled = line.enabled === undefined ? true : Boolean(line.enabled);
      let status = calculateStatus(expiresAt);
      if (!enabled) status = 'blocked';
      else if (isDemo) status = 'demo';

      const { error } = await supabaseAdmin
        .from('lines')
        .upsert(
          {
            platform: 'clicktv',
            external_id: String(line.id),
            username: line.username,
            password: line.password ?? null,
            screens: line.max_connections ?? 1,
            package_id: line.package_id ?? null,
            package_label: packageLabel(line.package_id),
            expires_at: expiresAt,
            status,
            is_demo: isDemo,
            last_synced_at: now,
            synced_data: line as any,
          },
          { onConflict: 'platform,external_id' },
        );

      if (!error) result.clicktv.upserted++;
    }

    // Actualizar créditos
    try {
      const info = await clicktv.getUserInfo();
      if (typeof info?.credits === 'number') {
        await supabaseAdmin
          .from('app_config')
          .update({ clicktv_credits: info.credits })
          .eq('id', 1);
      }
    } catch {}
  } catch (e: any) {
    result.clicktv.error = e?.message || String(e);
  }

  // ── Raptor ──
  try {
    const accounts = await raptor.listAccounts();
    result.raptor.fetched = accounts.length;
    const now = new Date().toISOString();

    // Pre-cargar IDs existentes para no pisar password/screens/package_label editados manualmente
    const { data: existingRaptor } = await supabaseAdmin
      .from('lines')
      .select('id, external_id')
      .eq('platform', 'raptor');

    const existingMap = new Map<string, string>(
      (existingRaptor ?? []).map((l) => [l.external_id, l.id]),
    );

    for (const acc of accounts) {
      const status = acc.blocked ? 'blocked' : calculateStatus(acc.expires_at);
      const existingId = existingMap.get(acc.email);

      if (existingId) {
        // Registro ya existe → solo actualizar lo que Raptor informa (fecha, estado)
        // NO pisar password, screens, ni package_label que el usuario pudo haber editado
        const { error } = await supabaseAdmin
          .from('lines')
          .update({
            username:       acc.email,
            expires_at:     acc.expires_at,
            status,
            last_synced_at: now,
            synced_data:    acc as any,
          })
          .eq('id', existingId);

        if (!error) result.raptor.upserted++;
      } else {
        // Registro nuevo → insertar con valores por defecto
        const { error } = await supabaseAdmin
          .from('lines')
          .insert({
            platform:      'raptor',
            external_id:   acc.email,
            username:      acc.email,
            password:      '123456',
            screens:       3,
            package_label: 'Premium (3 pantallas)',
            expires_at:    acc.expires_at,
            status,
            last_synced_at: now,
            synced_data:   acc as any,
          });

        if (!error) result.raptor.upserted++;
      }
    }

    // Actualizar créditos Raptor
    try {
      const credits = await raptor.getCredits();
      if (credits !== null) {
        await supabaseAdmin
          .from('app_config')
          .update({ raptor_credits: credits })
          .eq('id', 1);
      }
    } catch {}
  } catch (e: any) {
    result.raptor.error = e?.message || String(e);
  }

  // Marcar fecha de último sync
  await supabaseAdmin
    .from('app_config')
    .update({ last_full_sync_at: new Date().toISOString() })
    .eq('id', 1);

  result.duration_ms = Date.now() - start;
  return result;
}
