import { packageSummary } from "@/lib/demo/packages";
import type { DemoResultView } from "@/lib/demo/types";

const DEFAULT_TEMPLATE =
  "*ClientArea by Nodo 7 OTT*\nTu demo ya está lista.\n\n" +
  "Plan: {paquete}\n{contenido}\n\n{credenciales}\n\n{vencimiento}";

function credentialLines(result: DemoResultView): string {
  if (result.kind === "line") {
    return `Usuario: ${result.username}\nContraseña: ${result.password}`;
  }
  if (result.kind === "activecode") {
    return `Código de activación: ${result.code}`;
  }
  return "";
}

function expirationLine(result: DemoResultView): string {
  if (result.kind === "activecode") {
    return "El tiempo empieza cuando actives el código.";
  }
  if (!result.expiresAt) return "Duración definida por el proveedor.";
  return `Vence: ${new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(result.expiresAt))}`;
}

/**
 * NODO7 can reword the message from an environment variable without a deploy.
 * An unknown placeholder is left untouched rather than blanked, so a typo is
 * visible instead of silently dropping the credentials.
 */
export function buildCredentialMessage(result: DemoResultView): string {
  const template = process.env.WHATSAPP_MESSAGE_TEMPLATE || DEFAULT_TEMPLATE;
  return template
    .replace(/\\n/g, "\n")
    .replaceAll("{credenciales}", credentialLines(result))
    .replaceAll("{vencimiento}", expirationLine(result))
    .replaceAll("{paquete}", result.packageName)
    .replaceAll("{contenido}", packageSummary(result.packageId))
    .trim();
}
