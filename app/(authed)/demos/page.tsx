'use client';

import { Topbar } from '@/components/layout/Topbar';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDemos } from '@/lib/hooks';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Play, Shield, AlertCircle, CheckCircle, XCircle, Search, X,
  ExternalLink, Copy, Download, RefreshCw, UserCheck, Clock,
  Zap, Users, Ban, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { DemoRequest, DemoStatus } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PACKAGE_LABELS: Record<number, { label: string; icon: React.ReactNode }> = {
  7: { label: '1h FULL',    icon: <Zap  className="h-3 w-3" /> },
  6: { label: '4h',         icon: <Clock className="h-3 w-3" /> },
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copiado'));
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `54${digits}` : digits}`;
}

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

function exportToCsv(demos: DemoRequest[]) {
  const headers = ['Nombre', 'Teléfono', 'Tipo', 'Usuario', 'Estado', 'IP', 'Fecha'];
  const rows = demos.map((d) => [
    d.name,
    d.phone,
    PACKAGE_LABELS[d.package_id]?.label ?? d.package_id,
    d.username ?? '',
    d.status,
    d.ip,
    d.created_at.slice(0, 19).replace('T', ' '),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `demos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Badge de estado ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DemoStatus }) {
  const map: Record<DemoStatus, { label: string; className: string; icon: React.ReactNode }> = {
    ok:      { label: 'Exitosa',   className: 'bg-success/10 text-success border-success/20',      icon: <CheckCircle className="h-3 w-3" /> },
    blocked: { label: 'Bloqueada', className: 'bg-warning/10 text-warning border-warning/20',      icon: <Ban         className="h-3 w-3" /> },
    error:   { label: 'Error',     className: 'bg-danger/10  text-danger  border-danger/20',        icon: <XCircle     className="h-3 w-3" /> },
  };
  const { label, className, icon } = map[status] ?? map.error;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border', className)}>
      {icon}{label}
    </span>
  );
}

// ── Card de demo ──────────────────────────────────────────────────────────────
function DemoCard({ demo }: { demo: DemoRequest & { line_status?: string | null; line_expires_at?: string | null } }) {
  const pkg = PACKAGE_LABELS[demo.package_id];

  return (
    <div className={cn(
      'bg-bg-elevated rounded-2xl border p-4 shadow-card transition-all hover:shadow-card-hover',
      demo.status === 'ok'      && 'border-success/15',
      demo.status === 'blocked' && 'border-warning/15',
      demo.status === 'error'   && 'border-danger/15',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar inicial */}
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
            demo.status === 'ok'      && 'bg-success/10 text-success',
            demo.status === 'blocked' && 'bg-warning/10 text-warning',
            demo.status === 'error'   && 'bg-danger/10 text-danger',
          )}>
            {demo.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-fg truncate">{demo.name}</div>
            <div className="text-xs text-fg-subtle">{timeAgo(demo.created_at)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={demo.status} />
          {pkg && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
              {pkg.icon}{pkg.label}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {/* Teléfono */}
        <div className="bg-bg rounded-xl p-2.5 border border-border">
          <div className="text-fg-subtle mb-0.5 font-medium">WhatsApp</div>
          <div className="font-mono font-bold text-fg">{demo.phone || '—'}</div>
        </div>

        {/* Usuario generado */}
        <div className="bg-bg rounded-xl p-2.5 border border-border">
          <div className="text-fg-subtle mb-0.5 font-medium">Usuario ClickTV</div>
          {demo.username ? (
            <div className="font-mono font-bold text-fg truncate">{demo.username}</div>
          ) : (
            <div className="text-fg-subtle italic">—</div>
          )}
        </div>
      </div>

      {/* IP */}
      <div className="text-[11px] text-fg-subtle mb-3 flex items-center gap-1.5">
        <Shield className="h-3 w-3 shrink-0" />
        <span className="font-mono">{demo.ip}</span>
        {demo.error_msg && (
          <span className="ml-1 text-danger font-semibold truncate">· {demo.error_msg}</span>
        )}
      </div>

      {/* Ya es cliente */}
      {demo.client_id && (
        <Link
          href={`/clients/${demo.client_id}`}
          className="flex items-center gap-1.5 text-[11px] font-bold text-success hover:underline mb-3"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Ya es cliente{demo.client_name ? `: ${demo.client_name}` : ''}
        </Link>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* WhatsApp directo */}
        {demo.phone && (
          <a
            href={whatsappUrl(demo.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold border border-[#25D366]/20 transition-all"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        )}

        {/* Copiar usuario */}
        {demo.username && (
          <button
            onClick={() => copyToClipboard(demo.username!)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg hover:bg-bg-muted border border-border text-fg-muted hover:text-fg text-xs font-bold transition-all"
          >
            <Copy className="h-3 w-3" /> Copiar usuario
          </button>
        )}

        {/* Ver línea */}
        {demo.username && (
          <Link
            href={`/lines?search=${encodeURIComponent(demo.username)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg hover:bg-bg-muted border border-border text-fg-muted hover:text-fg text-xs font-bold transition-all"
          >
            <ExternalLink className="h-3 w-3" /> Ver línea
          </Link>
        )}

        {/* Crear cliente */}
        {demo.status === 'ok' && !demo.client_id && demo.phone && (
          <Link
            href={`/clients?prefill_phone=${encodeURIComponent(demo.phone)}&prefill_name=${encodeURIComponent(demo.name)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-xs font-bold transition-all"
          >
            <Users className="h-3 w-3" /> Crear cliente
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DemosPage() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');

  const { data, isLoading, refetch, isFetching } = useDemos({
    status: statusFilter || undefined,
    search: search.trim().length >= 2 ? search.trim() : undefined,
  });

  const demos  = data?.demos  || [];
  const stats  = data?.stats  || { total: 0, ok: 0, blocked: 0, error: 0 };

  const conversionRate = stats.total > 0
    ? Math.round((stats.ok / stats.total) * 100)
    : 0;

  const hasFilters = !!(search || statusFilter);

  const STATUS_FILTERS = [
    { value: '',        label: 'Todas',     count: stats.total   },
    { value: 'ok',      label: 'Exitosas',  count: stats.ok      },
    { value: 'blocked', label: 'Bloqueadas',count: stats.blocked },
    { value: 'error',   label: 'Errores',   count: stats.error   },
  ];

  return (
    <>
      <Topbar
        title="Demos"
        subtitle={isLoading ? 'Cargando…' : `${stats.total} solicitudes registradas`}
      />

      <div className="px-3 md:px-8 py-4 md:py-6 max-w-6xl space-y-5">

        {/* ── Stats ── */}
        {!isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-bg-elevated rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{stats.total}</div>
                <div className="text-xs font-semibold text-fg-muted">Total</div>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-2xl border border-success/20 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{stats.ok}</div>
                <div className="text-xs font-semibold text-success/70">Exitosas</div>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-2xl border border-warning/20 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.blocked}</div>
                <div className="text-xs font-semibold text-warning/70">Bloqueadas</div>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{conversionRate}%</div>
                <div className="text-xs font-semibold text-fg-muted">Tasa de éxito</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-4 space-y-3">
          <div className="flex gap-2">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
              <Input
                placeholder="Buscar por nombre, teléfono o usuario…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-bg-muted text-fg-subtle"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Refresh */}
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Exportar CSV */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv(demos)}
              disabled={!demos.length}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-fg-muted flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" /> Estado:
            </span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                  statusFilter === f.value
                    ? f.value === 'ok'      ? 'bg-success/10 text-success border-success/25'
                    : f.value === 'blocked' ? 'bg-warning/10 text-warning border-warning/25'
                    : f.value === 'error'   ? 'bg-danger/10  text-danger  border-danger/25'
                    : 'bg-bg-muted text-fg border-border'
                    : 'bg-bg text-fg-muted border-border hover:bg-bg-muted',
                )}
              >
                {f.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                  {f.count}
                </span>
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatus(''); }}
                className="ml-auto text-xs font-bold text-danger hover:opacity-70 transition-opacity"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Lista ── */}
        {isLoading ? (
          <LoadingState />
        ) : demos.length === 0 ? (
          <EmptyState
            icon={<Play className="h-10 w-10 text-fg-subtle" />}
            title="Sin demos registradas"
            description={hasFilters ? 'Probá cambiando los filtros.' : 'Cuando alguien genere una demo desde /demo, aparecerá acá.'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {demos.map((demo) => (
              <DemoCard key={demo.id} demo={demo as any} />
            ))}
          </div>
        )}

        {demos.length > 0 && (
          <p className="text-center text-xs text-fg-subtle py-2">
            Mostrando {demos.length} registro{demos.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </>
  );
}
