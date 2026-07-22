import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { differenceInDays, parseISO, format } from 'date-fns';

const createSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.searchParams.get('search');
  const expiring = url.searchParams.get('expiring'); // '7','3','1','expired'

  let query = supabaseAdmin
    .from('clients_with_lines')
    .select('*')
    .order('next_expiry', { ascending: true, nullsFirst: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtro por vencimiento client-side (timezone-safe: compara solo YYYY-MM-DD)
  let filtered = data || [];
  if (expiring) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayDate = parseISO(todayStr);
    const days = expiring === 'expired' ? -1 : parseInt(expiring, 10);
    filtered = filtered.filter((c: any) => {
      if (!c.next_expiry) return false;
      const expStr = String(c.next_expiry).slice(0, 10);
      const expDate = parseISO(expStr);
      const diff = differenceInDays(expDate, todayDate);
      if (expiring === 'expired') return diff < 0;
      return diff >= 0 && diff <= days;
    });
  }

  return NextResponse.json({ clients: filtered });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = createSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(input)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ client: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
