import type { MessageTemplate } from '@/types';

/**
 * Elige la plantilla más adecuada según la acción y plataforma.
 * Orden de prioridad: clave+plataforma → clave → plataforma → primera disponible
 */
export function selectBestTemplate(
  templates: MessageTemplate[],
  platform: 'clicktv' | 'raptor',
  action: 'renew' | 'new' | 'expiry' | 'message' = 'message',
): string {
  if (!templates.length) return '';

  const matchesRenew  = (t: MessageTemplate) =>
    /renov|renew|renuev/i.test(t.key + ' ' + t.name);
  const matchesNew    = (t: MessageTemplate) =>
    /alta|nueva|bienvenid|new|welcome/i.test(t.key + ' ' + t.name);
  const matchesExpiry = (t: MessageTemplate) =>
    /expir|venc|aviso|reminder/i.test(t.key + ' ' + t.name);

  const candidates: ((t: MessageTemplate) => boolean)[] = [];

  if (action === 'renew') {
    candidates.push((t) => matchesRenew(t) && t.platform === platform);
    candidates.push((t) => matchesRenew(t));
  } else if (action === 'new') {
    candidates.push((t) => matchesNew(t) && t.platform === platform);
    candidates.push((t) => matchesNew(t));
  } else if (action === 'expiry') {
    candidates.push((t) => matchesExpiry(t) && t.platform === platform);
    candidates.push((t) => matchesExpiry(t));
    // fallback: renewal template is closer than a generic one
    candidates.push((t) => matchesRenew(t) && t.platform === platform);
    candidates.push((t) => matchesRenew(t));
  }

  candidates.push((t) => t.platform === platform);
  candidates.push(() => true);

  for (const fn of candidates) {
    const found = templates.find(fn);
    if (found) return found.id;
  }
  return templates[0].id;
}

/** Renderiza una plantilla sustituyendo {variable} por valores */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    if (value === null || value === undefined) return match;
    return String(value);
  });
}

/** URL de WhatsApp con mensaje pre-cargado (formato wa.me, compatible móvil) */
export function whatsappUrl(phone: string | null, message: string): string {
  const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
  const encoded = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
