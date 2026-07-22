import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ lineId: string; shareId: string }> },
) {
  const { lineId, shareId } = await params;
  const { error } = await supabaseAdmin
    .from('line_shares')
    .delete()
    .eq('id', shareId)
    .eq('line_id', lineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
