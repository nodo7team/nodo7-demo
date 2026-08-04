/**
 * Verifies the credential type migration against the real database.
 *
 * Creates one access code of each type, redeems it, and deletes what it
 * created. It never calls the demo provider, so it costs no credits, and it
 * never prints an access code or a secret.
 *
 * Run: npx.cmd tsx scripts/verify-credential-type.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";

function loadLocalEnvironment(): void {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

let failures = 0;

function check(label: string, passed: boolean): void {
  if (!passed) failures += 1;
  console.log(`${passed ? "  ok  " : " FALLA"}  ${label}`);
}

async function main(): Promise<void> {
  loadLocalEnvironment();

  const repository = createSupabaseDemoRepository();
  const service = createDemoService(repository);
  const createdIds: string[] = [];

  try {
    for (const type of ["line", "activecode"] as const) {
      const { code, record } = await service.createAdminCode(type);
      createdIds.push(record.id);

      check(`${type}: la base guarda el tipo elegido`, record.credentialType === type);
      check(
        `${type}: nace pendiente y sin reloj`,
        record.status === "pending" && record.sessionDeadline === null,
      );

      const session = await service.activateAccessCode({
        code,
        ip: "127.0.0.1",
        now: new Date(),
      });
      const view = await service.getSessionView(session.token, new Date());
      check(`${type}: el canje abre la ventana de diez minutos`, view.state === "setup");

      const reused = await service
        .activateAccessCode({ code, ip: "127.0.0.1", now: new Date() })
        .then(() => "aceptado")
        .catch(() => "rechazado");
      check(`${type}: el codigo no se puede canjear dos veces`, reused === "rechazado");
    }

    const listed = await service.listAdminCodes({ limit: 10 });
    check(
      "el panel recibe un tipo valido en cada fila",
      listed.every(
        (row) => row.credentialType === "line" || row.credentialType === "activecode",
      ),
    );

    const cleanup = await service.cleanupDemoData();
    check(
      "la limpieza corregida se ejecuta sin error",
      Number.isFinite(cleanup.expired) && Number.isFinite(cleanup.redacted),
    );
  } finally {
    if (createdIds.length > 0) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error } = await admin
        .from("demo_access_codes")
        .delete()
        .in("id", createdIds);
      console.log(
        error
          ? `\nNo se pudieron borrar ${createdIds.length} codigos de prueba: ${error.message}`
          : `\nBorrados los ${createdIds.length} codigos de prueba que cree.`,
      );
    }
  }

  console.log(failures === 0 ? "\nTodo verificado." : `\n${failures} verificaciones fallaron.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
