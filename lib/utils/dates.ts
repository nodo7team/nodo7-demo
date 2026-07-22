import { differenceInDays, format, parseISO, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LineStatus } from '@/types';

/** Determina el estado de una línea según su fecha de vencimiento */
export function calculateStatus(
  expiresAt: string | null,
  currentStatus?: LineStatus,
): LineStatus {
  if (currentStatus === 'blocked' || currentStatus === 'demo') return currentStatus;
  if (!expiresAt) return 'active';

  const days = differenceInDays(parseISO(expiresAt), new Date());

  if (days < 0) return 'expired';
  if (days <= 7) return 'expiring';
  return 'active';
}

/** Días hasta vencimiento (negativo si ya venció) */
export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return differenceInDays(parseISO(expiresAt), new Date());
}

/** Formato corto: "15/03/2026" */
export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  return format(parseISO(expiresAt), 'dd/MM/yyyy');
}

/** Formato largo en español: "15 de marzo de 2026" */
export function formatExpiryLong(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  return format(parseISO(expiresAt), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Formato para templates de WhatsApp (dd/MM/yyyy) */
export function formatExpiryTemplate(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  return format(parseISO(expiresAt), 'dd/MM/yyyy');
}

/** Etiqueta amigable según días restantes */
export function expiryLabel(expiresAt: string | null): string {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return 'Sin vencimiento';
  if (days < 0) return `Vencida (${formatExpiry(expiresAt)})`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `Vence en ${days} días`;
  return formatExpiry(expiresAt);
}

/** Suma meses a una fecha y devuelve ISO date (YYYY-MM-DD) */
export function addMonthsISO(date: Date | string, months: number): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(addMonths(d, months), 'yyyy-MM-dd');
}

/** Color de badge según estado - tema claro */
export function statusColor(status: LineStatus): {
  bg: string;
  text: string;
  dot: string;
  label: string;
} {
  switch (status) {
    case 'active':
      return { bg: 'bg-success-soft', text: 'text-success-subtle', dot: 'bg-success', label: 'Activa' };
    case 'expiring':
      return { bg: 'bg-warning-soft', text: 'text-warning-subtle', dot: 'bg-warning', label: 'Por vencer' };
    case 'expired':
      return { bg: 'bg-danger-soft', text: 'text-danger-subtle', dot: 'bg-danger', label: 'Vencida' };
    case 'blocked':
      return { bg: 'bg-bg-muted', text: 'text-fg', dot: 'bg-fg-subtle', label: 'Bloqueada' };
    case 'demo':
      return { bg: 'bg-info-soft', text: 'text-info-subtle', dot: 'bg-info', label: 'Demo' };
  }
}
