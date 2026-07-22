'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PlatformBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, RefreshCw, Key, Trash2, Ban, Play, Plus, RotateCcw,
  CheckCircle, XCircle, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create_paid:      { label: 'Alta pago',       icon: Plus,       color: 'text-success' },
  create_demo:      { label: 'Alta demo',        icon: Zap,        color: 'text-warning' },
  renew:            { label: 'Renovación',       icon: RefreshCw,  color: 'text-clicktv-500' },
  renew_pass:       { label: 'Renov. + pass',    icon: RefreshCw,  color: 'text-clicktv-500' },
  reset_password:   { label: 'Reset password',   icon: Key,        color: 'text-raptor-500' },
  disable:          { label: 'Bloqueada',        icon: Ban,        color: 'text-danger' },
  enable:           { label: 'Desbloqueada',     icon: Play,       color: 'text-success' },
  block:            { label: 'Bloqueada',        icon: Ban,        color: 'text-danger' },
  unblock:          { label: 'Desbloqueada',     icon: Play,       color: 'text-success' },
  delete:           { label: 'Eliminada',        icon: Trash2,     color: 'text-danger' },
  sync:             { label: 'Sincronización',   icon: RotateCcw,  color: 'text-fg-muted' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ActivityPage() {
  const { data, isLoading, refetch } = useQuery<{ logs: any[] }>({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity?limit=200');
      if (!res.ok) throw new Error('Error al cargar');
      return res.json();
    },
    staleTime: 30_000,
  });

  const logs = data?.logs || [];

  return (
    <>
      <Topbar title="Historial de acciones" subtitle={`${logs.length} acciones recientes`} />

      <div className="px-5 md:px-8 py-6 max-w-4xl">
        {isLoading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-10 w-10 text-fg-subtle" />}
            title="Sin actividad"
            description="Aún no hay acciones registradas"
          />
        ) : (
          <div className="bg-bg-elevated rounded-2xl border border-border shadow-card overflow-hidden">
            {logs.map((log, i) => {
              const meta = ACTION_META[log.action] || { label: log.action, icon: Activity, color: 'text-fg-muted' };
              const Icon = meta.icon;
              return (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-center gap-4 px-5 py-3 text-sm',
                    i !== 0 && 'border-t border-border',
                    !log.success && 'bg-danger/3',
                  )}
                >
                  {/* Icon */}
                  <div className={cn('shrink-0', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Action + platform */}
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <span className="font-semibold text-fg">{meta.label}</span>
                    {log.platform && <PlatformBadge platform={log.platform} />}
                  </div>

                  {/* Line ID (truncated) */}
                  {log.line_id && (
                    <span className="text-xs font-mono text-fg-subtle truncate hidden sm:block max-w-[120px]">
                      {log.line_id.slice(0, 8)}…
                    </span>
                  )}

                  {/* Error */}
                  {log.error_message && (
                    <span className="text-xs text-danger truncate flex-1">{log.error_message}</span>
                  )}

                  {/* Status + time */}
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    {log.success
                      ? <CheckCircle className="h-3.5 w-3.5 text-success" />
                      : <XCircle className="h-3.5 w-3.5 text-danger" />
                    }
                    <span className="text-xs text-fg-subtle whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
