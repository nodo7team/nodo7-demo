import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as clicktv from '@/lib/platforms/clicktv';
import { supabaseAdmin } from '@/lib/db/supabase';
import { CLICKTV_PACKAGES } from '@/types';
import { generatePassword, generateUsername } from '@/lib/utils/generators';

// ── Constantes ──────────────────────────────────────────────────────────────
// Solo se permiten los package IDs de demo — NUNCA paquetes pagos
const ALLOWED_DEMO_PACKAGE_IDS = [6, 7] as const;
type DemoPackageId = (typeof ALLOWED_DEMO_PACKAGE_IDS)[number];

// Ventana de bloqueo por IP: 24 horas
const IP_BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae y normaliza la IP del request (Vercel siempre envía x-forwarded-for) */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Normaliza un teléfono argentino a sus últimos 10 dígitos (canónico).
 * Maneja todos los formatos habituales:
 *   2612136248  →  2612136248  (local, 10 dígitos)
 *   02612136248 →  2612136248  (con 0 de discado)
 *   92612136248 →  2612136248  (con 9 de celular)
 *   542612136248 → 2612136248  (con código país sin 9)
 *  5492612136248 → 2612136248  (con código país + 9)
 * 00542612136248 → 2612136248  (con 0054 internacional)
 */
function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, '');          // solo dígitos
  if (d.startsWith('0054')) d = d.slice(4);  // quitar 0054
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2); // quitar 54
  if (d.startsWith('9')  && d.length === 11) d = d.slice(1); // quitar 9 celular
  if (d.startsWith('0')  && d.length === 11) d = d.slice(1); // quitar 0 discado
  return d.slice(-10); // canónico: últimos 10 dígitos
}

// ── Schema de entrada ────────────────────────────────────────────────────────
const schema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80)
    .trim(),
  phone: z
    .string()
    .min(7, 'Número de WhatsApp inválido')
    .max(20),
  package_id: z.union([z.literal(6), z.literal(7)], {
    errorMap: () => ({ message: 'Tipo de demo inválido' }),
  }),
});

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // 1. Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  // 2. Validar con Zod
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Datos inválidos.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, package_id } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  const ip = getClientIP(req);

  // Sanidad: el teléfono normalizado debe tener al menos 7 dígitos
  if (phone.length < 7) {
    return NextResponse.json({ error: 'Número de WhatsApp inválido.' }, { status: 400 });
  }

  // 3. Verificar que el package_id sea realmente un demo
  const pkg = CLICKTV_PACKAGES.find(
    (p) => p.id === package_id && p.is_trial,
  );
  if (!pkg) {
    // Alguien manipuló el frontend — rechazar sin detalles
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  // 4. Anti-abuso: verificar teléfono (bloqueo permanente)
  const { data: phoneRecord } = await supabaseAdmin
    .from('demo_requests')
    .select('id, created_at')
    .eq('phone', phone)
    .eq('status', 'ok')
    .limit(1)
    .maybeSingle();

  if (phoneRecord) {
    // Registrar intento bloqueado para auditoría
    await supabaseAdmin.from('demo_requests').insert({
      name, phone, ip,
      package_id,
      status: 'blocked',
      error_msg: 'phone_duplicate',
    });
    return NextResponse.json(
      { error: 'Ya existe una demo generada para este número de WhatsApp.' },
      { status: 429 },
    );
  }

  // 5. Anti-abuso: verificar IP (bloqueo 24h)
  const since = new Date(Date.now() - IP_BLOCK_WINDOW_MS).toISOString();
  const { data: ipRecord } = await supabaseAdmin
    .from('demo_requests')
    .select('id')
    .eq('ip', ip)
    .eq('status', 'ok')
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();

  if (ipRecord) {
    await supabaseAdmin.from('demo_requests').insert({
      name, phone, ip,
      package_id,
      status: 'blocked',
      error_msg: 'ip_rate_limit',
    });
    return NextResponse.json(
      { error: 'Demasiadas solicitudes desde tu red. Intentá de nuevo mañana.' },
      { status: 429 },
    );
  }

  // 6. Generar credenciales
  const username = generateUsername(name);
  const password = generatePassword(8);

  // 7. Crear la cuenta demo en ClickTV
  let apiRes: any;
  try {
    apiRes = await clicktv.createLine({
      package: package_id,
      username,
      password,
      trial: 1,
    });
  } catch (e: any) {
    await supabaseAdmin.from('demo_requests').insert({
      name, phone, ip, package_id,
      status: 'error',
      error_msg: `clicktv_exception: ${e?.message ?? 'unknown'}`,
    });
    return NextResponse.json(
      { error: 'No se pudo crear la demo. Intentá más tarde.' },
      { status: 502 },
    );
  }

  if (apiRes?._parseError || apiRes?.result === false || apiRes?.error) {
    await supabaseAdmin.from('demo_requests').insert({
      name, phone, ip, package_id,
      status: 'error',
      error_msg: `clicktv_api: ${apiRes?.error ?? apiRes?.message ?? 'unknown'}`,
    });
    return NextResponse.json(
      { error: 'No se pudo crear la demo. Intentá más tarde.' },
      { status: 502 },
    );
  }

  // 8. Extraer datos reales de la respuesta de ClickTV
  const realUsername: string = apiRes?.username ?? apiRes?.data?.username ?? username;
  const realPassword: string = apiRes?.password ?? apiRes?.data?.password ?? password;
  const expDate: string | null = clicktv.parseExpDate(
    apiRes?.exp_date ?? apiRes?.data?.exp_date,
  );
  const externalId = String(apiRes?.id ?? apiRes?.data?.id ?? `demo_${Date.now()}`);

  // 9. Guardar en tabla lines (igual que el flujo admin)
  const { data: line } = await supabaseAdmin
    .from('lines')
    .upsert(
      {
        platform: 'clicktv',
        external_id: externalId,
        username: realUsername,
        password: realPassword,
        screens: pkg.screens,
        package_id: pkg.id,
        package_label: pkg.name,
        expires_at: expDate,
        status: 'demo',
        is_demo: true,
        client_id: null,
        last_synced_at: new Date().toISOString(),
        synced_data: apiRes,
      },
      { onConflict: 'platform,external_id' },
    )
    .select('id')
    .single();

  // 10. Guardar registro de demo (para anti-abuso y seguimiento)
  await supabaseAdmin.from('demo_requests').insert({
    name,
    phone,
    ip,
    package_id,
    username: realUsername,
    password: realPassword,
    line_id: line?.id ?? null,
    status: 'ok',
  });

  // 11. Responder — SOLO los datos necesarios para mostrar al cliente
  return NextResponse.json({
    username: realUsername,
    password: realPassword,
    expires_at: expDate,
    package_name: pkg.name,
  });
}
