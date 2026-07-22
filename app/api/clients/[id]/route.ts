import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

const updateSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Cliente con sus líneas
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { data: lines } = await supabaseAdmin
    .from('lines')
    .select('*')
    .eq('client_id', id)
    .order('expires_at', { ascending: true });

  const { data: logs } = await supabaseAdmin
    .from('actions_log')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(30);

  // Líneas donde este cliente aparece como compartido (no es el dueño principal)
  const { data: sharedLineShares } = await supabaseAdmin
    .from('line_shares')
    .select('*, lines(id, platform, username, screens, expires_at, status, client_id)')
    .eq('client_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    client,
    lines: lines || [],
    logs: logs || [],
    shared_lines: sharedLineShares || [],
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let input: z.infer<typeof updateSchema>;
  try {
    input = updateSchema.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Desvincular líneas
  const { error: unlinkError } = await supabaseAdmin.from('lines').update({ client_id: null }).eq('client_id', id);
  if (unlinkError) {
    return NextResponse.json({ error: 'Error desvinculando líneas: ' + unlinkError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
