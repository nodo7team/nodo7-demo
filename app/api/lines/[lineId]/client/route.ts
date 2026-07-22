import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

const schema = z.object({
  client_id: z.string().uuid().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  const { lineId } = await params;
  try {
    const body = await req.json();
    const { client_id } = schema.parse(body);
    const { data, error } = await supabaseAdmin
      .from('lines')
      .update({ client_id })
      .eq('id', lineId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ line: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 400 });
  }
}
