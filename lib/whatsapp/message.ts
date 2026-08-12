import { findPackage, packageSummary } from "@/lib/demo/packages";
import type { DemoPackageId, DemoResultView } from "@/lib/demo/types";

const DEFAULT_TEMPLATE =
  "*ClientArea by Nodo 7 OTT*\nTu demo ya está lista.\n\n" +
  "Plan: {paquete}\n{contenido}\n\n{credenciales}\n\n{vencimiento}";

/**
 * The follow-up asks and nothing else: no price, no offer. Someone who just
 * lost the picture is answering a question, not reading an ad.
 */
const DEFAULT_FOLLOWUP_FULL =
  "*Nodo 7 OTT*\n\nHola {nombre} 👋\n\n" +
  "Se terminó tu hora de prueba y quería saber cómo te fue.\n" +
  "Tuviste la grilla completa: fútbol en vivo, eventos y los packs premium.\n\n" +
  "¿Se vio bien? ¿Enganchó rápido, sin cortes?\n\n" +
  "Contanos con confianza, sea bueno o malo. Lo leemos todo 🙌";

const DEFAULT_FOLLOWUP_LITE =
  "*Nodo 7 OTT*\n\nHola {nombre} 👋\n\n" +
  "Terminaron tus 4 horas de prueba y quería saber qué te pareció.\n\n" +
  "Te aclaro algo: esa demo venía con la grilla recortada, sin fútbol\n" +
  "en vivo ni packs premium. Si te faltó justo eso, era por el plan.\n\n" +
  "De lo que sí pudiste ver, ¿cómo anduvo? ¿Se vio fluido?\n\n" +
  "Contanos con confianza, sea bueno o malo. Lo leemos todo 🙌";

function credentialLines(result: DemoResultView): string {
  if (result.kind === "line") {
    return `Usuario: ${result.username}\nContraseña: ${result.password}`;
  }
  if (result.kind === "activecode") {
    return `Código de activación: ${result.code}`;
  }
  return "";
}

/** "1 hora", "45 minutos", "1 hora y 30 minutos". */
export function humanDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = hours === 1 ? "1 hora" : `${hours} horas`;
  const restPart = rest === 1 ? "1 minuto" : `${rest} minutos`;
  if (hours === 0) return restPart;
  if (rest === 0) return hourPart;
  return `${hourPart} y ${restPart}`;
}

/**
 * How long is left, never a clock time. The server runs in UTC and has no idea
 * where the visitor is: telling an Argentine their demo ends at 18:00 when
 * their own clock says 15:00 hands them three hours that do not exist.
 */
function expirationLine(result: DemoResultView, now: Date): string {
  if (result.kind === "activecode") {
    return "El tiempo empieza cuando actives el código.";
  }
  if (!result.expiresAt) return "Duración definida por el proveedor.";

  const minutes = Math.round(
    (new Date(result.expiresAt).getTime() - now.getTime()) / 60_000,
  );
  if (!Number.isFinite(minutes)) return "Duración definida por el proveedor.";
  if (minutes <= 0) return "Tu demo ya venció.";
  return `Vence en ${humanDuration(minutes)}, desde este momento.`;
}

/**
 * NODO7 can reword the message from an environment variable without a deploy.
 * An unknown placeholder is left untouched rather than blanked, so a typo is
 * visible instead of silently dropping the credentials.
 */
export function buildCredentialMessage(
  result: DemoResultView,
  now: Date = new Date(),
): string {
  const template = process.env.WHATSAPP_MESSAGE_TEMPLATE || DEFAULT_TEMPLATE;
  return template
    .replace(/\\n/g, "\n")
    .replaceAll("{credenciales}", credentialLines(result))
    .replaceAll("{vencimiento}", expirationLine(result, now))
    .replaceAll("{paquete}", result.packageName)
    .replaceAll("{contenido}", packageSummary(result.packageId))
    .trim();
}

/**
 * Asks how the demo went. The wording follows the package: asking someone who
 * took the four-hour demo about the football would be asking about something
 * that demo never showed them.
 */
export function buildFollowupMessage(input: {
  name: string;
  packageId: DemoPackageId;
}): string {
  const item = findPackage(input.packageId);
  const fallback =
    item.excludes.length === 0 ? DEFAULT_FOLLOWUP_FULL : DEFAULT_FOLLOWUP_LITE;
  const override =
    item.excludes.length === 0
      ? process.env.WHATSAPP_FOLLOWUP_FULL
      : process.env.WHATSAPP_FOLLOWUP_LITE;

  const firstName = input.name.trim().split(/\s+/)[0] || "";
  return (override || fallback)
    .replace(/\\n/g, "\n")
    .replaceAll("{nombre}", firstName)
    .replaceAll("{paquete}", item.name)
    .trim();
}
