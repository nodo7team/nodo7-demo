import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .select('*')
    .order('key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

const createSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guión bajo'),
  name: z.string().min(1),
  body: z.string().min(1),
  platform: z.enum(['clicktv', 'raptor']).nullable().optional(),
  variables: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let input: z.infer<typeof createSchema>;
  try { input = createSchema.parse(body); } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  // Auto-detect variables from body {variable}
  const detectedVars = [...new Set((input.body.match(/\{(\w+)\}/g) || []).map((m) => m.slice(1, -1)))];

  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .insert({
      key: input.key,
      name: input.name,
      body: input.body,
      platform: input.platform ?? null,
      variables: input.variables ?? detectedVars,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
