import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

const schema = z.object({ line_id: z.string().uuid() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  const { line_id } = parsed;

  const { data, error } = await supabaseAdmin
    .from('lines')
    .update({ client_id: id })
    .eq('id', line_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ line: data });
}
