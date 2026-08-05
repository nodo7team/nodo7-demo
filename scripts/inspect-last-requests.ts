/**
 * Shows what happened to the most recent demo requests: status, error code,
 * credential type and delivery outcome. Never prints a secret or a full phone.
 *
 * Run: npx.cmd tsx scripts/inspect-last-requests.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnvironment(): void {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function mask(phone: string | null): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length < 6 ? "—" : `${digits.slice(0, 4)}…${digits.slice(-4)}`;
}

async function main(): Promise<void> {
  loadLocalEnvironment();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await db
    .from("demo_requests")
    .select(
      "id,created_at,name,package_id,status,attempt_count,error_code,phone,delivery_status,provider_external_id,username,demo_access_codes(credential_type,status)",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  for (const row of data ?? []) {
    const code = Array.isArray((row as any).demo_access_codes)
      ? (row as any).demo_access_codes[0]
      : (row as any).demo_access_codes;
    console.log(`\n--- ${row.created_at} ---`);
    console.log(`  nombre          ${row.name}`);
    console.log(`  tipo            ${code?.credential_type ?? "?"}`);
    console.log(`  paquete         ${row.package_id}`);
    console.log(`  estado          ${row.status}  (intento ${row.attempt_count})`);
    console.log(`  error_code      ${row.error_code ?? "—"}`);
    console.log(`  id externo      ${row.provider_external_id ?? "—"}`);
    console.log(`  usuario creado  ${row.username ? "sí" : "no"}`);
    console.log(`  teléfono        ${mask(row.phone)}`);
    console.log(`  entrega         ${row.delivery_status}`);
    console.log(`  código de acceso ${code?.status ?? "?"}`);
  }

  if (!data?.length) console.log("Sin solicitudes registradas.");
}

void main();
