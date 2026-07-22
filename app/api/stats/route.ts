import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

/** Estado real basado en expires_at (no el guardado en DB que puede estar desactualizado) */
function realStatus(storedStatus: string, expiresAt: string | null): string {
  // blocked y demo no cambian con el tiempo
  if (storedStatus === 'blocked' || storedStatus === 'demo') return storedStatus;
  if (!expiresAt) return 'active'; // sin vencimiento = activa permanente
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'expiring';
  return 'active';
}

export async function GET() {
  const [linesRes, configRes, clientsRes] = await Promise.all([
    supabaseAdmin.from('lines').select('status, expires_at, platform, client_id'),
    supabaseAdmin.from('app_config').select('clicktv_credits, last_full_sync_at').eq('id', 1).single(),
    supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }),
  ]);

  const lines = linesRes.data ?? [];
  const now = Date.now();

  // Contadores reales
  const counts = { active: 0, expiring: 0, expired: 0, blocked: 0, demo: 0, clicktv: 0, raptor: 0, unlinked: 0 };
  // Vencimientos por día (0 = hoy, 1 = mañana, ..., 6 = en 6 días)
  const byDay: number[] = Array(7).fill(0);

  for (const l of lines) {
    const rs = realStatus(l.status, l.expires_at);
    counts[rs as keyof typeof counts]++;
    if (l.platform === 'clicktv') counts.clicktv++;
    if (l.platform === 'raptor') counts.raptor++;
    if (!l.client_id) counts.unlinked++;

    // Clasificar vencimientos de los próximos 7 días
    if (l.expires_at && rs !== 'blocked' && rs !== 'demo' && rs !== 'expired') {
      const daysLeft = Math.floor((new Date(l.expires_at).getTime() - now) / 86_400_000);
      if (daysLeft >= 0 && daysLeft <= 6) {
        byDay[daysLeft]++;
      }
    }
  }

  return NextResponse.json({
    lines: {
      total: lines.length,
      active: counts.active,
      expiring: counts.expiring,
      expired: counts.expired,
      blocked: counts.blocked,
      demo: counts.demo,
      clicktv: counts.clicktv,
      raptor: counts.raptor,
      unlinked: counts.unlinked,
      expiring_today: byDay[0],
    },
    next7days: byDay.map((count, day) => ({ day, count })),
    clients: { total: clientsRes.count ?? 0 },
    config: {
      clicktv_credits: configRes.data?.clicktv_credits ?? null,
      last_full_sync_at: configRes.data?.last_full_sync_at ?? null,
    },
  });
}
