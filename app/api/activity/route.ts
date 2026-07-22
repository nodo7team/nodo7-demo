import { supabaseAdmin } from '@/lib/db/supabase';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  const ok = await getSession();
  if (!ok) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(200, parseInt(url.searchParams.get('limit') || '100', 10));

  const { data, error } = await supabaseAdmin
    .from('actions_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
