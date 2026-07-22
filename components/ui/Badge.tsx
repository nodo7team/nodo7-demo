import { cn } from '@/lib/utils/cn';
import type { LineStatus, Platform } from '@/types';
import { statusColor } from '@/lib/utils/dates';
import { Tv2, Zap } from 'lucide-react';

export function StatusBadge({ status }: { status: LineStatus }) {
  const colors = statusColor(status);
  const pulse = status === 'expiring' || status === 'expired';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        colors.bg,
        colors.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot, pulse && 'animate-pulse')} />
      {colors.label}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  if (platform === 'clicktv') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-clicktv-100 text-clicktv-600 border border-clicktv-200">
        <Tv2 className="h-2.5 w-2.5 shrink-0" />
        ClickTV
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-raptor-100 text-raptor-600 border border-raptor-200">
      <Zap className="h-2.5 w-2.5 shrink-0" />
      Raptor
    </span>
  );
}
