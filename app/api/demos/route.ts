import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status') || '';   // ok | error | blocked | ''
  const search   = searchParams.get('search') || '';   // nombre o teléfono
  const limit    = Math.min(Number(searchParams.get('limit') || '200'), 500);

  // ── Traer demos con estado de línea ───────────────────────────────────────
  let query = supabaseAdmin
    .from('demo_requests')
    .select(`
      id, name, phone, ip, package_id,
      username, password, line_id, status, error_msg, created_at,
      lines ( id, status, expires_at )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  if (search.trim()) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,username.ilike.%${term}%`);
  }

  const { data: demos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Cruzar teléfonos con clientes existentes ─────────────────────────────
  const phones = [...new Set((demos || []).map((d: any) => d.phone).filter(Boolean))];
  let clientsByPhone: Record<string, { id: string; name: string | null }> = {};

  if (phones.length) {
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone')
      .in('phone', phones);

    for (const c of clients || []) {
      if (c.phone) clientsByPhone[c.phone] = { id: c.id, name: c.name };
    }
  }

  // ── Enriquecer cada demo ──────────────────────────────────────────────────
  const enriched = (demos || []).map((d: any) => ({
    ...d,
    line_status: d.lines?.status ?? null,
    line_expires_at: d.lines?.expires_at ?? null,
    client_id:   clientsByPhone[d.phone]?.id   ?? null,
    client_name: clientsByPhone[d.phone]?.name ?? null,
  }));

  // ── Stats globales (sin filtros, para los contadores) ────────────────────
  const { data: allStats } = await supabaseAdmin
    .from('demo_requests')
    .select('status');

  const stats = {
    total:   allStats?.length ?? 0,
    ok:      allStats?.filter((r: any) => r.status === 'ok').length      ?? 0,
    blocked: allStats?.filter((r: any) => r.status === 'blocked').length ?? 0,
    error:   allStats?.filter((r: any) => r.status === 'error').length   ?? 0,
  };

  return NextResponse.json({ demos: enriched, stats });
}
