'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge';
import { useStats, useGlobalSearch, useClients } from '@/lib/hooks';
import { expiryLabel } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';
import {
  AlertTriangle, Tv, Users, Zap, Plus, Search, ExternalLink,
  Link2Off, Shield, RefreshCw, CircleDollarSign,
  ArrowUpRight, ArrowDownRight, Clock, TrendingUp,
  CalendarClock, Phone, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, href, pulse,
}: {
  label: string; value: number | string; sub?: string;
  icon: any; color: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted';
  href?: string; pulse?: boolean;
}) {
  const palette = {
    success: { gradient: 'from-success/20 to-success/5', iconBg: 'bg-success/10', iconText: 'text-success', text: 'text-success', subColor: 'text-success/70' },
    warning: { gradient: 'from-warning/20 to-warning/5', iconBg: 'bg-warning/10', iconText: 'text-warning', text: 'text-warning', subColor: 'text-warning/70' },
    danger:  { gradient: 'from-danger/20 to-danger/5',   iconBg: 'bg-danger/10',  iconText: 'text-danger',  text: 'text-danger',  subColor: 'text-danger/70' },
    info:    { gradient: 'from-raptor-500/15 to-raptor-500/5', iconBg: 'bg-raptor-500/10', iconText: 'text-raptor-500', text: 'text-raptor-500', subColor: 'text-raptor-500/70' },
    accent:  { gradient: 'from-clicktv-500/15 to-clicktv-500/5', iconBg: 'bg-clicktv-500/10', iconText: 'text-clicktv-500', text: 'text-clicktv-500', subColor: 'text-clicktv-500/70' },
    muted:   { gradient: 'from-fg/10 to-fg/5', iconBg: 'bg-fg/10', iconText: 'text-fg', text: 'text-fg', subColor: 'text-fg-muted' },
  }[color];

  const inner = (
    <div className={cn(
      'relative overflow-hidden bg-bg-elevated rounded-2xl border border-border p-5',
      'shadow-card transition-all duration-300',
      href && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5',
    )}>
      {/* gradient bg */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none', palette.gradient)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', palette.iconBg)}>
            <Icon className={cn('h-5 w-5', palette.iconText)} />
          </div>
          {href && <ArrowUpRight className="h-4 w-4 text-fg-subtle" />}
        </div>
        <div className={cn(
          'font-display text-3xl font-bold leading-none tracking-tight',
          palette.text,
          pulse && 'animate-pulse-soft',
        )}>
          {value}
        </div>
        <div className="mt-1.5 text-sm font-semibold text-fg">{label}</div>
        {sub && <p className={cn('text-xs mt-0.5 font-medium', palette.subColor)}>{sub}</p>}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ── Timeline visual ───────────────────────────────────────────────────
function ExpiryTimeline({ days }: { days: { day: number; count: number }[] }) {
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const labels = ['HOY', 'MÑN', '+2', '+3', '+4', '+5', '+6'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-fg-subtle" />
        </div>
        <h3 className="text-sm font-bold text-fg">Vencimientos próximos 7 días</h3>
      </div>

      {/* Fila de contadores */}
      <div className="flex gap-1.5 mb-1.5">
        {days.map(({ day, count }) => {
          const isUrgent = day === 0;
          const isSoon = day <= 2;
          return (
            <div key={day} className="flex-1 text-center h-5">
              {count > 0 && (
                <span className={cn(
                  'text-[11px] font-bold leading-none',
                  isUrgent ? 'text-danger' : isSoon ? 'text-warning' : 'text-info',
                )}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fila de barras */}
      <div className="flex items-end gap-1.5 h-28">
        {days.map(({ day, count }) => {
          const pct = count === 0 ? 5 : Math.max(14, Math.round((count / maxCount) * 100));
          const isUrgent = day === 0;
          const isSoon = day <= 2;
          const barColor = isUrgent ? 'bg-danger' : isSoon ? 'bg-warning' : 'bg-info';
          const barBg   = isUrgent ? 'bg-danger/10' : isSoon ? 'bg-warning/10' : 'bg-info/10';
          return (
            <div key={day} className={cn('flex-1 rounded-t-xl relative overflow-hidden h-full', barBg)}>
              <div
                className={cn('absolute bottom-0 left-0 right-0 rounded-t-xl transition-all duration-700', barColor)}
                style={{ height: `${pct}%`, minHeight: count > 0 ? '5px' : '0' }}
              />
            </div>
          );
        })}
      </div>

      {/* Fila de etiquetas */}
      <div className="flex gap-1.5 mt-2">
        {days.map(({ day }) => (
          <div key={day} className="flex-1 text-center">
            <span className={cn(
              'text-[9px] font-bold tracking-wide',
              day === 0 ? 'text-danger' : 'text-fg-subtle',
            )}>
              {labels[day]}
            </span>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-border">
        {[
          { label: 'Hoy', color: 'bg-danger' },
          { label: 'Urgente', color: 'bg-warning' },
          { label: 'Próximo', color: 'bg-info' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
            <span className={cn('h-2 w-2 rounded-full shrink-0', item.color)} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Alerta de vencimientos (display only, sin hook propio) ──────────
function ExpiryAlertRow({ label, clients, color, href }: {
  label: string;
  clients: any[];
  color: 'danger' | 'warning' | 'info';
  href: string;
}) {
  const colors = {
    danger:  { border: 'border-danger/20',  dot: 'bg-danger',  text: 'text-danger',  badge: 'bg-danger/10 text-danger' },
    warning: { border: 'border-warning/20', dot: 'bg-warning', text: 'text-warning', badge: 'bg-warning/10 text-warning' },
    info:    { border: 'border-info/20',    dot: 'bg-info',    text: 'text-info',    badge: 'bg-info/10 text-info' },
  }[color];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
          <span className={cn('text-xs font-bold uppercase tracking-wide', colors.text)}>{label}</span>
        </div>
        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', colors.badge)}>
          {clients.length}
        </span>
      </div>

      {clients.length === 0 ? (
        <div className="text-xs text-fg-subtle py-1 pl-4">Ningún cliente en este rango</div>
      ) : (
        <div className="space-y-1.5">
          {clients.slice(0, 5).map((c: any) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group',
                colors.border, 'bg-bg-elevated hover:bg-bg-muted hover:shadow-sm',
              )}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{c.name || c.phone || 'Sin nombre'}</span>
                {c.phone && c.name && <div className="text-[11px] text-fg-muted">{c.phone}</div>}
              </div>
              <span className={cn('text-[11px] font-bold shrink-0', colors.text)}>
                {expiryLabel(c.next_expiry)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
          {clients.length > 5 && (
            <Link href={href} className="block text-center py-1.5">
              <span className="text-[11px] font-bold text-fg-muted hover:text-clicktv-500 transition-colors">
                +{clients.length - 5} más →
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Diferencia en días entre hoy y una fecha ISO (ignora horas)
function dayDiff(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(isoDate.slice(0, 10) + 'T00:00:00');
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

// ── Search result row ────────────────────────────────────────────────
function SearchResult({ result }: { result: any }) {
  if (result.type === 'client') {
    const c = result.data;
    return (
      <Link
        href={`/clients/${c.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-bg-muted transition-colors group"
      >
        <div className="h-9 w-9 rounded-lg bg-clicktv-500/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-clicktv-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{c.name || 'Sin nombre'}</div>
          <div className="text-[11px] text-fg-muted">{c.phone || 'Sin teléfono'}</div>
        </div>
        <div className="text-[11px] text-fg-subtle font-medium shrink-0">
          {c.active_lines || 0} línea{c.active_lines !== 1 ? 's' : ''}
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </Link>
    );
  }

  const l = result.data;
  return (
    <Link
      href={l.clients?.id ? `/clients/${l.clients.id}` : `/lines`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-muted transition-colors group"
    >
      <div className="shrink-0">
        <PlatformBadge platform={l.platform} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{l.username}</div>
        <div className="text-[11px] text-fg-muted">{l.clients?.name || l.clients?.phone || 'Sin cliente'}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const { data: statsData, isLoading, refetch: refetchStats } = useStats();
  const { results: searchResults, isLoading: searchLoading } = useGlobalSearch(search);
  const { data: expiringData, isLoading: expiringLoading } = useClients(undefined, '7');

  const stats  = statsData?.lines;
  const next7  = statsData?.next7days ?? [];
  const config = statsData?.config;

  // Clientes con vencimiento en los próximos 7 días, divididos en rangos exclusivos
  const allExpiringClients = expiringData?.clients ?? [];
  const todayClients = allExpiringClients.filter((c) => c.next_expiry && dayDiff(String(c.next_expiry)) === 0);
  const soon3Clients = allExpiringClients.filter((c) => {
    if (!c.next_expiry) return false;
    const d = dayDiff(String(c.next_expiry));
    return d > 0 && d <= 3;
  });
  const soon7Clients = allExpiringClients.filter((c) => {
    if (!c.next_expiry) return false;
    const d = dayDiff(String(c.next_expiry));
    return d > 3 && d <= 7;
  });

  const totalSuscribers = (stats?.active ?? 0) + (stats?.expiring ?? 0);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      toast.success(`Sincronizado: ${data.clicktv?.upserted ?? 0} ClickTV + ${data.raptor?.upserted ?? 0} Raptor`);
      refetchStats();
    } catch (e: any) {
      toast.error('Error al sincronizar: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const showSearch = search.trim().length >= 2;

  return (
    <>
      <Topbar title="Dashboard" subtitle="Centro de operaciones" />

      <div className="px-5 md:px-8 py-6 space-y-6 max-w-7xl">

        {/* ── Banner urgencia ── */}
        {!isLoading && (stats?.expiring_today ?? 0) > 0 && (
          <Link href="/expiring-today" className="block animate-slide-up">
            <div className="relative overflow-hidden rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 flex items-center gap-4 hover:bg-danger/10 transition-colors">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-danger/10 pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="flex-1 relative">
                <span className="font-bold text-danger text-sm">
                  {stats!.expiring_today} línea{stats!.expiring_today !== 1 ? 's' : ''} vence{stats!.expiring_today !== 1 ? 'n' : ''} HOY
                </span>
                <span className="text-xs text-danger/70 ml-2">— Contactá a esos clientes ahora</span>
              </div>
              <span className="text-sm text-danger font-bold relative">Ver →</span>
            </div>
          </Link>
        )}

        {/* ── KPIs ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Suscriptores"
              value={totalSuscribers}
              sub="Activas + por vencer"
              icon={Zap}
              color="success"
              href="/lines?status=active"
            />
            <StatCard
              label="Por vencer"
              value={stats?.expiring ?? 0}
              sub="Próximos 7 días"
              icon={AlertTriangle}
              color="warning"
              pulse={(stats?.expiring ?? 0) > 0}
              href="/expiring-today"
            />
            <StatCard
              label="Vencidas"
              value={stats?.expired ?? 0}
              sub="Requieren renovación"
              icon={ArrowDownRight}
              color="danger"
              href="/lines?status=expired"
            />
            <StatCard
              label="ClickTV"
              value={stats?.clicktv ?? 0}
              sub={`${stats?.raptor ?? 0} Raptor`}
              icon={Tv}
              color="accent"
              href="/lines?platform=clicktv"
            />
          </div>
        )}

        {/* ── Segunda fila KPIs ── */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clientes', value: statsData?.clients.total ?? 0, icon: Users, href: '/clients' },
              { label: 'Sin vincular', value: stats?.unlinked ?? 0, icon: Link2Off, color: (stats?.unlinked ?? 0) > 0 ? 'text-warning' : 'text-fg', href: '/lines?unlinked=true' },
              { label: 'Créditos', value: config?.clicktv_credits ?? '—', icon: CircleDollarSign, color: config?.clicktv_credits !== null ? 'text-clicktv-500' : 'text-fg-subtle', href: '/settings' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="block">
                <div className="bg-bg-elevated rounded-2xl shadow-card p-4 text-center transition-all hover:shadow-card-hover hover:-translate-y-0.5">
                  <div className={cn('text-2xl font-display font-bold', item.color || 'text-fg')}>{item.value}</div>
                  <div className="text-xs text-fg-subtle font-medium mt-1 flex items-center justify-center gap-1">
                    <item.icon className="h-3 w-3" /> {item.label}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Búsqueda rápida ── */}
        <div className="bg-bg-elevated rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-clicktv-500/10 flex items-center justify-center">
                <Search className="h-4 w-4 text-clicktv-500" />
              </div>
              <h3 className="text-sm font-bold text-fg">Búsqueda global</h3>
            </div>
            <span className="text-[11px] text-fg-subtle font-medium">
              Busca clientes o líneas por nombre, teléfono o username
            </span>
          </div>

          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
            <Input
              placeholder="Ej: Juan, 3515551234, matiastv877…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {showSearch && (
            <div className="mt-3 bg-bg rounded-xl border border-border divide-y divide-border max-w-lg animate-fade-in overflow-hidden">
              {searchLoading ? (
                <div className="p-4 text-sm text-fg-muted text-center animate-pulse">Buscando…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-fg-muted text-center">
                  Sin resultados para <span className="font-bold text-fg">"{search}"</span>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 bg-bg-muted border-b border-border">
                    <span className="text-[11px] font-bold text-fg-muted uppercase tracking-wide">
                      {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {searchResults.slice(0, 12).map((r: any, i: number) => (
                    <SearchResult key={`${r.type}-${r.data.id}-${i}`} result={r} />
                  ))}
                  {searchResults.length > 12 && (
                    <div className="px-4 py-2 text-center text-[11px] text-fg-muted">
                      +{searchResults.length - 12} más
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Timeline + Alertas ── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-bg-elevated rounded-2xl shadow-card p-5">
            {isLoading ? (
              <div className="h-40 animate-pulse bg-bg-muted rounded-xl" />
            ) : (
              <ExpiryTimeline days={next7} />
            )}
          </div>

          <div className="bg-bg-elevated rounded-2xl shadow-card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-fg-subtle" />
              </div>
              <h3 className="text-sm font-bold text-fg">Clientes que vencen pronto</h3>
            </div>

            {expiringLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : allExpiringClients.length === 0 ? (
              (stats?.expiring ?? 0) > 0 ? (
                /* Hay líneas venciendo pero sin cliente vinculado */
                <Link
                  href="/clients/link-pending"
                  className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors group"
                >
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-warning">
                      {stats!.expiring} línea{stats!.expiring !== 1 ? 's' : ''} por vencer sin cliente asignado
                    </p>
                    <p className="text-xs text-warning/70 mt-0.5">
                      Vinculá las líneas a clientes para verlas aquí →
                    </p>
                  </div>
                </Link>
              ) : (
                /* No hay nada venciendo */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                    <Shield className="h-7 w-7 text-success" />
                  </div>
                  <p className="text-sm text-fg-muted font-bold">Sin vencimientos urgentes</p>
                  <p className="text-xs text-fg-subtle mt-1">Todo en orden por los próximos 7 días</p>
                </div>
              )
            ) : (
              <>
                <ExpiryAlertRow label="Vencen hoy"      clients={todayClients} color="danger"  href="/expiring-today" />
                <ExpiryAlertRow label="Próximos 3 días" clients={soon3Clients} color="warning" href="/expiring-today" />
                <ExpiryAlertRow label="Próximos 7 días" clients={soon7Clients} color="info"    href="/expiring-today" />
              </>
            )}
          </div>
        </div>

        {/* ── Acciones rápidas ── */}
        <div className="bg-bg-elevated rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
              <Zap className="h-4 w-4 text-fg-subtle" />
            </div>
            <h3 className="text-sm font-bold text-fg">Acciones rápidas</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/lines/new">
              <Button variant="primary" size="md">
                <Plus className="h-4 w-4" /> Nueva línea
              </Button>
            </Link>
            <Link href="/clients/new">
              <Button variant="secondary" size="md">
                <Users className="h-4 w-4" /> Nuevo cliente
              </Button>
            </Link>
            <Link href="/expiring-today">
              <Button variant="secondary" size="md">
                <AlertTriangle className="h-4 w-4" /> Vencimientos
              </Button>
            </Link>
            <Button variant="secondary" size="md" onClick={handleSync} loading={syncing}>
              <RefreshCw className="h-4 w-4" /> Sincronizar
            </Button>
            {(stats?.unlinked ?? 0) > 0 && (
              <Link href="/lines">
                <Button variant="ghost" size="md">
                  <Link2Off className="h-4 w-4 text-warning" />
                  <span className="text-warning font-medium">{stats!.unlinked} sin vincular</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        {config?.last_full_sync_at && (
          <p className="text-[11px] text-fg-subtle pb-2 text-center">
            Último sync:{' '}
            {new Date(config.last_full_sync_at).toLocaleString('es-AR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false,
            })}
            {' '}· Stats en tiempo real
          </p>
        )}
      </div>
    </>
  );
}
