/**
 * Confirms the database has every migration this build needs, before a deploy
 * can break code generation for everyone.
 *
 * Read-only except for calling the cleanup functions, which is what the nightly
 * cron already does.
 *
 * Run: npx.cmd tsx scripts/check-migrations.ts
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

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FALTA"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main(): Promise<void> {
  loadLocalEnvironment();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log("0002 — tipo de credencial");
  const credentialType = await db
    .from("demo_access_codes")
    .select("credential_type")
    .limit(1);
  check("columna credential_type", !credentialType.error, credentialType.error?.message);

  console.log("\n0003 — entrega por WhatsApp");
  const delivery = await db
    .from("demo_requests")
    .select("phone,delivery_status")
    .limit(1);
  check("columnas phone y delivery_status", !delivery.error, delivery.error?.message);

  const recordDelivery = await db.rpc("record_demo_delivery", {
    p_request_id: "00000000-0000-4000-8000-000000000000",
    p_status: "pending",
  });
  check("función record_demo_delivery", !recordDelivery.error, recordDelivery.error?.message);

  const redact = await db.rpc("redact_demo_audit");
  check("función redact_demo_audit", !redact.error, redact.error?.message);

  console.log(
    failures === 0
      ? "\nLa base tiene todo lo que necesita este build."
      : `\n${failures} comprobaciones fallaron: no desplegar hasta correr las migraciones.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
