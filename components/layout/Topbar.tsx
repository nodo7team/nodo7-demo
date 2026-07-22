'use client';

import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

export function Topbar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const [syncing, setSyncing] = useState(false);

  const { data: config, refetch } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const res = await fetch('/api/config');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      toast.success(`Sincronizado: ${data.clicktv?.upserted || 0} ClickTV + ${data.raptor?.upserted || 0} Raptor`);
      refetch();
    } catch (e: any) {
      toast.error('Error al sincronizar: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-bg-panel/90 backdrop-blur-2xl border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold leading-tight tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-fg-subtle mt-0.5 truncate font-medium">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {typeof config?.clicktv_credits === 'number' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-clicktv-100 border border-clicktv-200 text-clicktv-600">
              <CircleDollarSign className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{config.clicktv_credits} créditos</span>
            </div>
          )}
          <ThemeToggle />
          {action ? action : (
            <Button variant="secondary" size="sm" loading={syncing} onClick={handleSync}>
              <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
