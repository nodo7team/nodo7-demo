'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { useSales, useSyncSales } from '@/lib/hooks';
import { useState, useMemo, useEffect, type ReactNode } from 'react';
import {
  TrendingUp, TrendingDown, CircleDollarSign, RefreshCw,
  Search, Calendar, ArrowUpRight, ArrowDownRight, CreditCard,
  Layers, Star, Zap, ChevronUp, ChevronDown, ArrowRightLeft, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, BarChart, Bar,
} from 'recharts';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num || 0);
}

function formatSaleDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return isoString; }
}

function formatMonthLabel(yearMonth: string): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [y, m] = yearMonth.split('-');
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

function formatDayLabel(dateStr: string): string {
  try {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  } catch { return dateStr; }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

// ── Period helpers ────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'last_month' | '3months' | '6months' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',       label: 'Esta semana' },
  { value: 'month',      label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: '3months',    label: '3 meses' },
  { value: '6months',    label: '6 meses' },
  { value: 'all',        label: 'Todo' },
];

function getPeriodRange(period: Period): [Date | null, Date | null] {
  const now = new Date();
  if (period === 'all') return [null, null];
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const dow = now.getDay();
    start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    start.setHours(0, 0, 0, 0);
    return [start, end];
  }
  if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return [start, end];
  }
  if (period === 'last_month') {
    return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    ];
  }
  if (period === '3months') {
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return [start, end];
  }
  if (period === '6months') {
    start.setMonth(start.getMonth() - 6);
    start.setHours(0, 0, 0, 0);
    return [start, end];
  }
  return [null, null];
}

function getPreviousPeriodRange(period: Period): [Date | null, Date | null] {
  const now = new Date();
  if (period === 'all') return [null, null];

  if (period === 'week') {
    const dow = now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    thisMonday.setHours(0, 0, 0, 0);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(thisMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(thisMonday.getDate() - 1);
    prevSunday.setHours(23, 59, 59, 999);
    return [prevMonday, prevSunday];
  }
  if (period === 'month') {
    return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    ];
  }
  if (period === 'last_month') {
    return [
      new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0),
      new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999),
    ];
  }
  if (period === '3months') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setMonth(end.getMonth() - 3);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return [start, end];
  }
  if (period === '6months') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 12);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setMonth(end.getMonth() - 6);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return [start, end];
  }
  return [null, null];
}

function filterByRange(transactions: any[], start: Date | null, end: Date | null): any[] {
  if (!start && !end) return transactions;
  return transactions.filter(t => {
    const d = new Date(t.sale_date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

// ── Compute functions ─────────────────────────────────────────────────────────

interface KPIs {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  avgTicket: number;
  incomeCount: number;
}

function computeKPIs(transactions: any[]): KPIs {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  for (const t of transactions) {
    const amount = parseFloat(t.amount) || 0;
    if (t.transaction_type === 'income') { totalIncome += amount; incomeCount++; }
    else totalExpense += amount;
  }
  return {
    totalIncome, totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    avgTicket: incomeCount > 0 ? totalIncome / incomeCount : 0,
    incomeCount,
  };
}

function computeDailyChart(transactions: any[]): { date: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.transaction_type !== 'income') continue;
    const dateStr = (t.sale_date as string).split('T')[0];
    map[dateStr] = (map[dateStr] || 0) + (parseFloat(t.amount) || 0);
  }
  return Object.entries(map)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeMonthlyChart(transactions: any[]): { month: string; label: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.transaction_type !== 'income') continue;
    const monthStr = (t.sale_date as string).substring(0, 7);
    map[monthStr] = (map[monthStr] || 0) + (parseFloat(t.amount) || 0);
  }
  return Object.entries(map)
    .map(([month, total]) => ({ month, label: formatMonthLabel(month), total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function computeAppDistribution(transactions: any[]): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.transaction_type !== 'income') continue;
    const appName = (t.app as string) || 'Desconocido';
    map[appName] = (map[appName] || 0) + (parseFloat(t.amount) || 0);
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function computeBestDay(chart: { date: string; total: number }[]): { date: string; total: number } | null {
  if (chart.length === 0) return null;
  return chart.reduce((best, curr) => curr.total > best.total ? curr : best);
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const APP_COLORS: Record<string, string> = {
  'Mercado Pago': '#009EE3',
  'Naranja X':    '#FF5000',
  'NaranjaX':     '#FF5000',
  'Ualá':         '#7D52FF',
  'Banco':        '#6B7280',
  'General':      '#10B981',
};
const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--bg-elevated))',
  borderColor: 'hsl(var(--border))',
  borderRadius: '1rem',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function DeltaBadge({ value, invertColors }: { value: number | null; invertColors?: boolean }) {
  if (value === null) return <span className="text-[10px] text-fg-subtle font-medium">— vs anterior</span>;
  const isPositive = invertColors ? value < 0 : value >= 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
      isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
    )}>
      {value >= 0 ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface KpiCardProps {
  icon: ReactNode;
  iconBg: string;
  gradient: string;
  label: string;
  labelClass: string;
  value: string;
  valueClass: string;
  sub: string;
  delta: number | null;
  invertColors?: boolean;
}

function KpiCard({ icon, iconBg, gradient, label, labelClass, value, valueClass, sub, delta, invertColors }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden bg-bg-elevated rounded-2xl border border-border p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${labelClass}`}>
            {label}
          </span>
        </div>
        <div className={`font-display text-2xl font-bold ${valueClass} leading-none truncate`}>
          {value}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-semibold text-fg-muted">{sub}</div>
          <DeltaBadge value={delta} invertColors={invertColors} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const { data, isLoading, refetch } = useSales();
  const syncSales = useSyncSales();

  const [period, setPeriod]         = useState<Period>('month');
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterApp, setFilterApp]   = useState<string>('all');
  const [mounted, setMounted]       = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const allTransactions = data?.transactions || [];

  const periodTx = useMemo(() => {
    const [start, end] = getPeriodRange(period);
    return filterByRange(allTransactions, start, end);
  }, [allTransactions, period]);

  const prevPeriodTx = useMemo(() => {
    const [start, end] = getPreviousPeriodRange(period);
    if (!start && !end) return null;
    return filterByRange(allTransactions, start, end);
  }, [allTransactions, period]);

  const kpis     = useMemo(() => computeKPIs(periodTx), [periodTx]);
  const prevKpis = useMemo(() => prevPeriodTx ? computeKPIs(prevPeriodTx) : null, [prevPeriodTx]);

  const dailyChart    = useMemo(() => computeDailyChart(periodTx), [periodTx]);
  const monthlyChart  = useMemo(() => computeMonthlyChart(allTransactions), [allTransactions]);
  const appDistrib    = useMemo(() => computeAppDistribution(periodTx), [periodTx]);

  const bestDay   = useMemo(() => computeBestDay(dailyChart), [dailyChart]);
  const bestMonth = useMemo(() => {
    const mc = computeMonthlyChart(allTransactions);
    return mc.length ? mc.reduce((b, c) => c.total > b.total ? c : b) : null;
  }, [allTransactions]);

  const uniqueApps = useMemo(() => {
    const apps = new Set<string>();
    allTransactions.forEach(t => { if (t.app) apps.add((t.app as string).trim()); });
    return Array.from(apps);
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    let list = [...periodTx];
    const query = search.trim().toLowerCase();
    if (query.length >= 2) {
      list = list.filter(t =>
        t.client_name.toLowerCase().includes(query) ||
        t.raw_notification.toLowerCase().includes(query) ||
        t.app.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    }
    if (filterType !== 'all') list = list.filter(t => t.transaction_type === filterType);
    if (filterApp !== 'all') list = list.filter(t => t.app === filterApp);
    return list;
  }, [periodTx, search, filterType, filterApp]);

  const handleSync = async () => {
    await syncSales.mutateAsync();
    refetch();
  };

  if (isLoading) return <LoadingState label="Cargando panel de ventas..." />;

  return (
    <>
      <Topbar
        title="Registro de Ventas"
        subtitle="Analíticas sincronizadas desde Google Sheets"
        action={
          <Button
            variant="primary"
            onClick={handleSync}
            loading={syncSales.isPending}
            className="bg-gradient-to-r from-success to-success/80 shadow-md"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', syncSales.isPending && 'animate-spin')} />
            Sincronizar Sheets
          </Button>
        }
      />

      <div className="px-5 md:px-8 py-6 space-y-6 max-w-7xl animate-fade-in">

        {/* ── Selector de Período ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                period === p.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-bg-elevated border border-border text-fg-muted hover:text-fg hover:border-accent/40'
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-fg-subtle font-medium">
            {periodTx.length} transacciones · {allTransactions.length} total histórico
          </span>
        </div>

        {/* ── KPIs (5 tarjetas con delta %) ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-success" />}
            iconBg="bg-success/10"
            gradient="from-success/15 to-success/5"
            label="Ingresos"
            labelClass="bg-success/10 text-success"
            value={formatCurrency(kpis.totalIncome)}
            valueClass="text-success"
            sub="Cobros del período"
            delta={prevKpis ? pctChange(kpis.totalIncome, prevKpis.totalIncome) : null}
          />
          <KpiCard
            icon={<TrendingDown className="h-5 w-5 text-danger" />}
            iconBg="bg-danger/10"
            gradient="from-danger/15 to-danger/5"
            label="Egresos"
            labelClass="bg-danger/10 text-danger"
            value={formatCurrency(kpis.totalExpense)}
            valueClass="text-danger"
            sub="Gastos del período"
            delta={prevKpis ? pctChange(kpis.totalExpense, prevKpis.totalExpense) : null}
            invertColors
          />
          <KpiCard
            icon={<CircleDollarSign className="h-5 w-5 text-accent" />}
            iconBg="bg-accent/10"
            gradient="from-accent/15 to-accent/5"
            label="Caja Neta"
            labelClass={kpis.netBalance >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}
            value={formatCurrency(kpis.netBalance)}
            valueClass={kpis.netBalance >= 0 ? 'text-accent' : 'text-danger'}
            sub="Balance neto"
            delta={prevKpis ? pctChange(kpis.netBalance, prevKpis.netBalance) : null}
          />
          <KpiCard
            icon={<Zap className="h-5 w-5 text-amber-400" />}
            iconBg="bg-amber-400/10"
            gradient="from-amber-400/15 to-amber-400/5"
            label="Ticket Prom."
            labelClass="bg-amber-400/10 text-amber-500"
            value={kpis.avgTicket > 0 ? formatCurrency(kpis.avgTicket) : '—'}
            valueClass="text-amber-400"
            sub={`${kpis.incomeCount} cobros`}
            delta={prevKpis ? pctChange(kpis.avgTicket, prevKpis.avgTicket) : null}
          />
          <KpiCard
            icon={<ArrowRightLeft className="h-5 w-5 text-fg-muted" />}
            iconBg="bg-bg-muted"
            gradient="from-fg/10 to-fg/5"
            label="Registros"
            labelClass="bg-bg-muted text-fg-muted"
            value={String(kpis.transactionCount)}
            valueClass="text-fg"
            sub="Transacciones"
            delta={prevKpis ? pctChange(kpis.transactionCount, prevKpis.transactionCount) : null}
          />
        </div>

        {/* ── Gráficos: Area (diario) + Pie (por app) ── */}
        {mounted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart — ingresos diarios del período */}
            <div className="bg-bg-elevated rounded-2xl border border-border p-5 shadow-card lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-accent" />
                  </div>
                  <h3 className="text-sm font-bold text-fg">Ingresos Diarios</h3>
                </div>
                <span className="text-[11px] text-fg-subtle font-medium">Período seleccionado</span>
              </div>
              <div className="h-64 w-full">
                {dailyChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-fg-subtle">
                    Sin datos de ingresos en este período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--fg-subtle))" fontSize={10} fontWeight="semibold" tickFormatter={formatDayLabel} />
                      <YAxis stroke="hsl(var(--fg-subtle))" fontSize={10} fontWeight="semibold" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelClassName="text-xs font-bold text-fg-muted"
                        formatter={(val) => [formatCurrency(val as number), 'Ingresos']}
                      />
                      <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pie Chart — distribución por app del período */}
            <div className="bg-bg-elevated rounded-2xl border border-border p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-success" />
                </div>
                <h3 className="text-sm font-bold text-fg">Por Aplicación</h3>
              </div>
              <div className="h-64 w-full flex flex-col justify-between">
                {appDistrib.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-fg-subtle">
                    Sin cobros en este período
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={appDistrib} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                            {appDistrib.map((entry, index) => {
                              const color = APP_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val as number), 'Total']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs px-1 pt-2 border-t border-border">
                      {appDistrib.map((entry, index) => {
                        const color = APP_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                        return (
                          <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-fg truncate">{entry.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Bar Chart mensual (histórico completo) ── */}
        {mounted && monthlyChart.length > 0 && (
          <div className="bg-bg-elevated rounded-2xl border border-border p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
                  <BarChart2 className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg">Ingresos por Mes</h3>
                  <p className="text-[11px] text-fg-subtle">Histórico completo</p>
                </div>
              </div>
              <span className="text-[11px] text-fg-subtle font-medium">{monthlyChart.length} meses registrados</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--fg-subtle))" fontSize={10} fontWeight="semibold" />
                  <YAxis stroke="hsl(var(--fg-subtle))" fontSize={10} fontWeight="semibold" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelClassName="text-xs font-bold text-fg-muted"
                    formatter={(val) => [formatCurrency(val as number), 'Ingresos']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Insights: mejor día + mejor mes ── */}
        {(bestDay || bestMonth) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bestDay && (
              <div className="bg-bg-elevated rounded-2xl border border-border p-4 shadow-card flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-fg-muted uppercase tracking-wider mb-0.5">
                    Mejor día del período
                  </div>
                  <div className="font-display text-xl font-bold text-fg leading-tight">
                    {formatCurrency(bestDay.total)}
                  </div>
                  <div className="text-xs text-fg-subtle mt-0.5 capitalize">
                    {formatDateFull(bestDay.date)}
                  </div>
                </div>
              </div>
            )}
            {bestMonth && (
              <div className="bg-bg-elevated rounded-2xl border border-border p-4 shadow-card flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-fg-muted uppercase tracking-wider mb-0.5">
                    Mejor mes histórico
                  </div>
                  <div className="font-display text-xl font-bold text-fg leading-tight">
                    {formatCurrency(bestMonth.total)}
                  </div>
                  <div className="text-xs text-fg-subtle mt-0.5">{bestMonth.label}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tabla de Transacciones ── */}
        <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-bg-muted flex items-center justify-center">
                <Layers className="h-4 w-4 text-fg-muted" />
              </div>
              <h3 className="text-sm font-bold text-fg">Registro de Transacciones</h3>
            </div>
            <span className="text-xs text-fg-subtle">
              {filteredTransactions.length} de {periodTx.length} en período · {allTransactions.length} total
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
              <Input
                placeholder="Buscar por cliente, descripción o monto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs bg-bg border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/30 text-fg font-semibold"
              >
                <option value="all">Todos los Tipos</option>
                <option value="income">Solo Cobros (Ingresos)</option>
                <option value="expense">Solo Gastos (Egresos)</option>
              </select>
              <select
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="text-xs bg-bg border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/30 text-fg font-semibold"
              >
                <option value="all">Todas las Apps</option>
                {uniqueApps.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-bg-panel">
            {filteredTransactions.length === 0 ? (
              <EmptyState title="No se encontraron transacciones" description="Prueba a cambiar el período o los filtros de búsqueda." />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Origen (App)</th>
                    <th className="px-4 py-3">Cliente / Detalle</th>
                    <th className="px-4 py-3 hidden md:table-cell">Notificación Cruda</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredTransactions.map((t) => {
                    const isIncome = t.transaction_type === 'income';
                    const appColor = APP_COLORS[(t.app as string)?.trim()] || '#6B7280';
                    return (
                      <tr key={t.id} className="hover:bg-bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-fg-subtle whitespace-nowrap">
                          {formatSaleDate(t.sale_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            isIncome ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                          )}>
                            {isIncome
                              ? <><ArrowUpRight className="h-3 w-3 shrink-0" /> Cobro</>
                              : <><ArrowDownRight className="h-3 w-3 shrink-0" /> Gasto</>}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: appColor + '22', color: appColor }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: appColor }} />
                            {t.app}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-fg truncate max-w-[150px]">{t.client_name}</div>
                          {t.platform !== 'general' && (
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 rounded uppercase tracking-wider',
                              t.platform === 'clicktv' ? 'bg-clicktv-500/10 text-clicktv-500' : 'bg-raptor-500/10 text-raptor-500'
                            )}>
                              {t.platform}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-fg-muted max-w-xs truncate hidden md:table-cell" title={t.raw_notification}>
                          {t.raw_notification}
                        </td>
                        <td className={cn(
                          'px-4 py-3 font-display font-bold text-right whitespace-nowrap',
                          isIncome ? 'text-success' : 'text-danger'
                        )}>
                          {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
