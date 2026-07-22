import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const unlinked = url.searchParams.get('unlinked');
  const excludeShared = url.searchParams.get('exclude_shared');
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(url.searchParams.get('limit') || '200', 10);
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const limit = isNaN(rawLimit) ? 200 : Math.min(500, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;

  const sort = url.searchParams.get('sort') || 'created_at_desc';

  let query = supabaseAdmin
    .from('lines')
    .select('*, clients(id, name, phone)', { count: 'exact' });

  // Aplicar ordenamiento dinámico
  if (sort === 'expires_at_asc') {
    query = query.order('expires_at', { ascending: true, nullsFirst: false });
  } else if (sort === 'expires_at_desc') {
    query = query.order('expires_at', { ascending: false, nullsFirst: false });
  } else if (sort === 'username_asc') {
    query = query.order('username', { ascending: true });
  } else if (sort === 'username_desc') {
    query = query.order('username', { ascending: false });
  } else {
    // Por defecto: cuentas creadas recientemente primero
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  if (platform) query = query.eq('platform', platform);
  if (status) query = query.eq('status', status);
  if (unlinked === 'true') query = query.is('client_id', null);
  if (search) {
    query = query.or(`username.ilike.%${search}%,external_id.ilike.%${search}%`);
  }

  // Exclude lines that already have shares (used in "vincular pendientes")
  if (excludeShared === 'true') {
    const { data: sharedLineIds } = await supabaseAdmin
      .from('line_shares')
      .select('line_id');
    const ids = (sharedLineIds || []).map((r: any) => r.line_id).filter(Boolean);
    if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    lines: data,
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
