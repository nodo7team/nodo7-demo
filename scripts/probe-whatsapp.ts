/**
 * Read-only probe of the waclient account.
 *
 * Only queries state: it lists instances, reads their connection info, and
 * validates one number. It never sends a message, and never creates, deletes,
 * reconnects or reconfigures anything. The access token is never printed.
 *
 * Run: npx.cmd tsx scripts/probe-whatsapp.ts [numero-a-validar]
 */
import { readFileSync } from "node:fs";

const BASE_URL = "https://api.waclient.com";

function loadLocalEnvironment(): void {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

/** Keeps a phone number readable without publishing it in full. */
function mask(phone: unknown): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 6) return "(sin número)";
  return `${digits.slice(0, 4)}…${digits.slice(-4)} (${digits.length} dígitos)`;
}

async function query(
  path: string,
  params: Record<string, string>,
): Promise<any> {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.text();
  try {
    return { httpStatus: response.status, payload: JSON.parse(body) };
  } catch {
    return { httpStatus: response.status, payload: null, raw: body.slice(0, 200) };
  }
}

async function main(): Promise<void> {
  loadLocalEnvironment();

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN no está definido");

  console.log("== list_instances ==");
  const list = await query("list_instances", { access_token: token });
  console.log(`HTTP ${list.httpStatus} · status=${list.payload?.status ?? "?"} · mensaje=${list.payload?.message ?? "?"}`);

  const instances: any[] = Array.isArray(list.payload?.data) ? list.payload.data : [];
  if (instances.length === 0) {
    console.log(list.raw ? `Respuesta no JSON: ${list.raw}` : "Sin instancias vinculadas todavía.");
  }

  for (const instance of instances) {
    console.log(`\n-- instancia ${instance.instance_id} --`);
    console.log(`  nombre            ${instance.name ?? "—"}`);
    console.log(`  número            ${mask(instance.phone)}`);
    console.log(`  session_status    ${instance.session_status}`);
    console.log(`  account_status    ${instance.account_status}`);
    console.log(`  relogin_required  ${instance.relogin_required}`);
    console.log(`  webhook_enabled   ${instance.webhook_enabled}`);

    const status = await query("instance_status", {
      instance_id: instance.instance_id,
      access_token: token,
      live: "1",
    });
    const data = status.payload?.data ?? {};
    console.log(`  connection_state  ${data.connection_state ?? "?"} (socket_loaded=${data.socket_loaded})`);

    const info = await query("instance_info", {
      instance_id: instance.instance_id,
      access_token: token,
    });
    const account = info.payload?.data?.account ?? {};
    const webhook = info.payload?.data?.webhook ?? {};
    console.log(`  número conectado  ${mask(account.phone)}`);
    console.log(`  webhook           ${webhook.enabled ? webhook.webhook_url : "sin configurar"}`);
  }

  const target = process.argv[2];
  if (target && instances.length > 0) {
    console.log("\n== check_number ==");
    const response = await fetch(`${BASE_URL}/check_number`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        numbers: [target.replace(/\D/g, "")],
        instance_id: instances[0].instance_id,
        access_token: token,
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    const result = payload?.data?.results?.[0];
    console.log(`HTTP ${response.status} · status=${payload?.status ?? "?"}`);
    console.log(`  ${mask(target)} → ${result ? `existe=${result.exists}` : "sin resultado"}`);
  } else if (!target) {
    console.log("\n(Pasá un número como argumento para probar check_number)");
  }

  console.log("\nSondeo terminado. No se envió ningún mensaje ni se modificó nada.");
}

void main();
