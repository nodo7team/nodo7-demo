import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { renderTemplate, whatsappUrl } from '@/lib/utils/templates';
import { formatExpiryTemplate } from '@/lib/utils/dates';

const schema = z.object({
  line_id: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Datos inválidos' }, { status: 400 });
  }

  // Obtener plantilla
  const { data: template } = await supabaseAdmin
    .from('message_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

  let vars: Record<string, string> = input.variables || {};
  let phone: string | null = null;

  // Si se pasó line_id, auto-llenar variables
  if (input.line_id) {
    const { data: line } = await supabaseAdmin
      .from('lines')
      .select('*, clients(name, phone)')
      .eq('id', input.line_id)
      .single();

    if (line) {
      vars = {
        username: line.username || '',
        password: line.password || '',
        screens: String(line.screens || 1),
        expiry_date: formatExpiryTemplate(line.expires_at),
        package: line.package_label || '',
        name: (line as any).clients?.name || '',
        ...vars, // los manuales sobreescriben
      };
      phone = (line as any).clients?.phone || null;
    }
  }

  const rendered = renderTemplate(template.body, vars);
  const waUrl = whatsappUrl(phone, rendered);

  return NextResponse.json({
    rendered,
    whatsapp_url: waUrl,
    phone,
    template_key: template.key,
  });
}
