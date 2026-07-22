import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-fg-subtle', className)} />;
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-fg-muted">
      <Spinner className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="text-fg-subtle mb-5">{icon}</div>}
      <h3 className="text-lg font-bold text-fg mb-2">{title}</h3>
      {description && <p className="text-sm text-fg-muted max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
