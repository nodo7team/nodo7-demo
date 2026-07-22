import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { z } from 'zod';

const addSchema = z.object({
  client_id: z.string().uuid(),
  screens: z.number().int().min(1),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  const { lineId } = await params;
  const { data, error } = await supabaseAdmin
    .from('line_shares')
    .select('*, clients(id, name, phone)')
    .eq('line_id', lineId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shares: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  const { lineId } = await params;
  try {
    const body = await req.json();
    const input = addSchema.parse(body);
    const { data, error } = await supabaseAdmin
      .from('line_shares')
      .insert({ line_id: lineId, ...input })
      .select('*, clients(id, name, phone)')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ share: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 400 });
  }
}
