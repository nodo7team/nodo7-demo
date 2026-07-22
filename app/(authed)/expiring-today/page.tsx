'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState } from '@/components/ui/States';
import {
  useLines, useLineAction, useTemplates, useRenderTemplate, useAppConfig,
} from '@/lib/hooks';
import { daysUntilExpiry, formatExpiry } from '@/lib/utils/dates';
import { selectBestTemplate } from '@/lib/utils/templates';
import { openWhatsApp } from '@/lib/utils/whatsapp';
import {
  CalendarX, RefreshCw, Copy, MessageSquare, ExternalLink,
  AlertTriangle, Clock, Zap, ChevronRight, Search, Filter,
  SlidersHorizontal, X, CheckSquare, Square, SkipForward,
  CheckCircle, XCircle, Bell, UserX, Pencil,
} from 'lucide-react';
import { EditLineSheet } from '@/components/EditLineSheet';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { LineStatus } from '@/types';

// ── Types ──
interface LineWithClient {
  id: string;
  platform: 'clicktv' | 'raptor';
  username: string;
  password: string | null;
  screens: number;
  package_id: number | null;
  package_label: string | null;
  expires_at: string | null;
  status: LineStatus;
  clients: { id: string; name: string | null; phone: string | null } | null;
}

interface PostRenewData {
  line: LineWithClient;
  rendered: string;
  waUrl: string;
  autoCopied: boolean;
  autoWhatsApp: boolean;
}

interface BulkResult {
  line: LineWithClient;
  success: boolean;
  rendered: string | null;
  waUrl: string | null;
  error: string | null;
}

// ── Helpers ──
function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copiado al portapapeles'));
}

// ── Post-Renew Dialog ──
function PostRenewDialog({ data, onClose }: { data: PostRenewData; onClose: () => void }) {
  const statusLine = [
    data.autoCopied && 'Mensaje copiado',
    data.autoWhatsApp && 'WhatsApp abierto',
  ].filter(Boolean).join(' · ') || 'Renovación completada';

  return (
    <Dialog open onClose={onClose} title="¡Renovada!" description={`Usuario: ${data.line.username}`}>
      <div className="space-y-4 mt-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/8 border border-success/20 text-success text-xs font-semibold">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {statusLine}
        </div>
        <div className="bg-bg rounded-xl border border-border p-3">
          <p className="text-xs font-semibold text-fg-muted mb-2">Mensaje enviado al cliente</p>
          <pre className="text-sm text-fg whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
            {data.rendered}
          </pre>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => { openWhatsApp(data.waUrl); }}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir WhatsApp otra vez
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => { copyText(data.rendered); }}
          >
            <Copy className="h-4 w-4" />
            Copiar de nuevo
          </Button>
        </div>
        <button
          onClick={onClose}
          className="w-full text-xs text-fg-subtle hover:text-fg-muted transition-colors py-1"
        >
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

// ── Bulk Results Modal ──
function BulkResultsModal({ results, onClose }: { results: BulkResult[]; onClose: () => void }) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Renovación masiva — ${successful.length}/${results.length}`}
      description={`${successful.length} renovadas · ${failed.length} con error`}
      className="max-w-2xl"
    >
      <div className="space-y-2 mt-3">
        {results.map((r) => (
          <div
            key={r.line.id}
            className={cn(
              'rounded-xl border p-3 flex items-center gap-3',
              r.success ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5',
            )}
          >
            {r.success
              ? <CheckCircle className="h-4 w-4 text-success shrink-0" />
              : <XCircle className="h-4 w-4 text-danger shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{r.line.username}</div>
              {r.error && <div className="text-xs text-danger mt-0.5">{r.error}</div>}
            </div>
            {r.success && r.rendered && (
              <div className="flex gap-1.5 shrink-0">
                {r.waUrl && (
                  <button
                    onClick={() => openWhatsApp(r.waUrl!)}
                    title="Abrir WhatsApp"
                    className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => copyText(r.rendered!)}
                  title="Copiar mensaje"
                  className="p-1.5 rounded-lg bg-bg hover:bg-bg-muted border border-border text-fg-muted transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        <Button variant="primary" size="sm" className="w-full mt-2" onClick={onClose}>
          Listo
        </Button>
      </div>
    </Dialog>
  );
}

// ── Reminder Queue Modal ──
function ReminderQueueModal({
  lines,
  templates,
  onClose,
}: {
  lines: LineWithClient[];
  templates: any[];
  onClose: () => void;
}) {
  const renderTpl = useRenderTemplate();
  const linesWithPhone = useMemo(() => lines.filter((l) => l.clients?.phone), [lines]);
  const linesNoPhone = useMemo(() => lines.filter((l) => !l.clients?.phone), [lines]);

  // '' = automático por plataforma; non-empty = override manual del usuario
  const [tplOverride, setTplOverride] = useState('');
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [rendered, setRendered] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [waitingReturn, setWaitingReturn] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = linesWithPhone.length;
  const currentLine = index < total ? linesWithPhone[index] : null;
  const isDone = index >= total;

  // Pre-renderiza el mensaje cuando cambia la línea o el override de plantilla
  useEffect(() => {
    if (!currentLine) return;

    // Calculamos aquí adentro para siempre tener la plataforma fresca de currentLine
    const tplId = tplOverride || selectBestTemplate(templates, currentLine.platform, 'expiry');
    if (!tplId) { setLoading(false); return; }

    setRendered(null);
    setWaUrl(null);
    setWaitingReturn(false);
    setLoading(true);

    renderTpl.mutate(
      { templateId: tplId, lineId: currentLine.id },
      {
        onSuccess: (r) => {
          setRendered(r.rendered);
          setWaUrl(r.whatsapp_url || null);
          setLoading(false);
        },
        onError: () => setLoading(false),
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tplOverride, templates]);

  // Detecta retorno de foco (usuario volvió de WhatsApp)
  useEffect(() => {
    if (!waitingReturn) return;
    const timer = setTimeout(() => {
      const handle = () => setWaitingReturn(false);
      window.addEventListener('focus', handle, { once: true });
      return () => window.removeEventListener('focus', handle);
    }, 800);
    return () => clearTimeout(timer);
  }, [waitingReturn]);

  const handleOpenWhatsApp = () => {
    if (!waUrl) return;
    openWhatsApp(waUrl);
    setWaitingReturn(true);
  };

  const handleSent = () => { setTplOverride(''); setSent((s) => s + 1); setIndex((i) => i + 1); };
  const handleSkip = () => { setTplOverride(''); setSkipped((s) => s + 1); setIndex((i) => i + 1); };

  const progress = total > 0 ? ((sent + skipped) / total) * 100 : 0;

  // Pantalla de resumen final
  if (isDone) {
    return (
      <Dialog open onClose={onClose} title="Recordatorios completados">
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-success">{sent}</div>
              <div className="text-xs font-semibold text-success/80 mt-1">Enviados</div>
            </div>
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-warning">{skipped}</div>
              <div className="text-xs font-semibold text-warning/80 mt-1">Saltados</div>
            </div>
            <div className="bg-bg-elevated border border-border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-fg-muted">{linesNoPhone.length}</div>
              <div className="text-xs font-semibold text-fg-subtle mt-1">Sin teléfono</div>
            </div>
          </div>
          {linesNoPhone.length > 0 && (
            <div className="bg-bg rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-fg-muted mb-2">Sin teléfono vinculado:</p>
              <div className="space-y-1">
                {linesNoPhone.map((l) => (
                  <div key={l.id} className="text-sm text-fg-muted flex items-center gap-2">
                    <UserX className="h-3 w-3" />
                    {l.username}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button variant="primary" size="sm" className="w-full" onClick={onClose}>
            Listo
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Recordatorios WhatsApp"
      description={`${sent + skipped} de ${total} procesados`}
    >
      <div className="space-y-4 mt-3">
        {/* Selector de plantilla — auto por plataforma, override manual posible */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-fg-subtle shrink-0">Plantilla:</span>
          <select
            value={tplOverride || (currentLine ? selectBestTemplate(templates, currentLine.platform, 'expiry') : '')}
            onChange={(e) => setTplOverride(e.target.value)}
            className="flex-1 text-xs bg-bg border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/30 text-fg"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Info del contacto actual */}
        <div className="bg-bg rounded-xl border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">{currentLine!.username}</div>
              <div className="text-xs text-fg-muted">
                {currentLine!.clients?.name || currentLine!.clients?.phone || 'Sin nombre'}
              </div>
            </div>
            <PlatformBadge platform={currentLine!.platform} />
          </div>
          {loading ? (
            <div className="text-sm text-fg-muted animate-pulse">Generando mensaje…</div>
          ) : rendered ? (
            <pre className="text-xs text-fg whitespace-pre-wrap font-sans leading-relaxed max-h-28 overflow-y-auto border-t border-border pt-2 mt-1">
              {rendered}
            </pre>
          ) : (
            <div className="text-sm text-warning text-xs">Sin plantilla disponible</div>
          )}
        </div>

        {/* Contador */}
        <div className="text-center text-xs text-fg-subtle">
          {index + 1} de {total} · {sent} enviados · {skipped} saltados
        </div>

        {/* Botones de acción */}
        {!waitingReturn ? (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              onClick={handleOpenWhatsApp}
              disabled={!waUrl || loading}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSkip}>
              <SkipForward className="h-4 w-4" />
              Saltar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-center text-fg-muted font-medium">¿Enviaste el mensaje?</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 bg-gradient-to-r from-success to-success/80"
                onClick={handleSent}
              >
                <CheckCircle className="h-4 w-4" />
                Sí, enviado
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={handleSkip}>
                <SkipForward className="h-4 w-4" />
                No enviado
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ── Expiring Card ──
function ExpiringCard({
  line,
  isToday,
  onRenew,
  onCopy,
  onWhatsApp,
  onEdit,
  renewing,
  copying,
  selected,
  onToggleSelect,
  selectionMode,
}: {
  line: LineWithClient;
  isToday: boolean;
  onRenew: (line: LineWithClient) => void;
  onCopy: (line: LineWithClient) => void;
  onWhatsApp: (line: LineWithClient) => void;
  onEdit: (line: LineWithClient) => void;
  renewing: boolean;
  copying: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  const days = daysUntilExpiry(line.expires_at);
  const clientName = line.clients?.name || line.clients?.phone || null;

  return (
    <div
      className={cn(
        'bg-bg-elevated rounded-2xl border p-4 md:p-5 shadow-card transition-all duration-300 animate-fade-in',
        isToday ? 'border-danger/20' : 'border-warning/15',
        'hover:shadow-card-hover',
        selected && 'ring-2 ring-accent border-accent/30',
        selectionMode && 'cursor-pointer select-none active:scale-[0.99]',
      )}
      onClick={selectionMode ? () => onToggleSelect(line.id) : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(line.id); }}
            className={cn(
              'shrink-0 rounded-md p-0.5 transition-all duration-200',
              selected
                ? 'text-accent'
                : selectionMode
                  ? 'text-fg-subtle hover:text-accent'
                  : 'text-fg-subtle/20 hover:text-fg-subtle',
            )}
          >
            {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <PlatformBadge platform={line.platform} />
          <StatusBadge status={line.status} />
        </div>
        <span
          className={cn(
            'text-xs font-bold px-2 py-1 rounded-full',
            isToday ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
          )}
        >
          {days === 0 ? 'Vence hoy' : days === 1 ? 'Vence mañana' : `En ${days} días`}
        </span>
      </div>

      {/* Username + client */}
      <div className="mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'text-lg font-bold font-display truncate',
              selectionMode && 'cursor-pointer hover:text-accent',
            )}
            onClick={selectionMode ? () => onToggleSelect(line.id) : undefined}
          >
            {line.username}
          </div>
          <button
            onClick={() => copyText(line.username)}
            title="Copiar usuario"
            className="flex-shrink-0 p-1 rounded-md text-fg-muted hover:text-fg-base hover:bg-white/10 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        {clientName ? (
          <Link
            href={`/clients/${line.clients!.id}`}
            className="text-sm text-fg-muted hover:text-clicktv-500 hover:underline transition-colors inline-flex items-center gap-1.5 mt-0.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {clientName}
          </Link>
        ) : (
          <span className="text-sm text-warning italic mt-0.5">Sin cliente vinculado</span>
        )}
        <div className="text-xs text-fg-subtle mt-1">
          {line.package_label || '—'} · {line.screens} pantalla{line.screens !== 1 ? 's' : ''} · Vence: {formatExpiry(line.expires_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onRenew(line)}
          loading={renewing}
          className={cn(
            'bg-gradient-to-r from-clicktv-500 to-clicktv-600',
            line.platform === 'raptor' && 'from-raptor-500 to-raptor-600',
          )}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Renovar</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onCopy(line)}
          loading={copying}
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Copiar</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onWhatsApp(line)}
          className="border-clicktv-500/20 hover:border-clicktv-500/30"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(line)}
          title="Editar línea"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      </div>
    </div>
  );
}

// ── Section header with "Select all" ──
function SectionHeader({
  icon,
  label,
  count,
  lines,
  selectedIds,
  onSelectAll,
  onClearSection,
  reminderButton,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  lines: LineWithClient[];
  selectedIds: Set<string>;
  onSelectAll: (lines: LineWithClient[]) => void;
  onClearSection: (lines: LineWithClient[]) => void;
  reminderButton?: React.ReactNode;
}) {
  const allSelected = lines.length > 0 && lines.every((l) => selectedIds.has(l.id));
  const someSelected = lines.some((l) => selectedIds.has(l.id));

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-4">
      {icon}
      <span className="text-sm font-bold text-fg">{label}</span>
      <span className="text-xs font-medium text-fg-subtle bg-bg rounded-full px-2.5 py-0.5 border border-border">
        {count}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {reminderButton}
        {lines.length > 0 && (
          <button
            onClick={() => allSelected ? onClearSection(lines) : onSelectAll(lines)}
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all',
              someSelected
                ? 'border-accent/30 text-accent bg-accent/5 hover:bg-accent/10'
                : 'border-border text-fg-muted bg-bg hover:bg-bg-muted',
            )}
          >
            {allSelected ? 'Deseleccionar' : 'Sel. todo'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──
export default function ExpiringTodayPage() {
  const { data, isLoading, refetch } = useLines({ status: 'expiring' });
  const lineAction = useLineAction();
  const { data: tplData } = useTemplates();
  const renderTpl = useRenderTemplate();
  const { data: appConfig } = useAppConfig();

  const templates = tplData?.templates || [];
  const allLines = (data?.lines || []) as LineWithClient[];

  // ── Filtros ──
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'clicktv' | 'raptor'>('all');
  const [sortBy, setSortBy] = useState<'days' | 'platform' | 'client'>('days');
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);

  const filteredLines = useMemo(() => {
    let lines = [...allLines];
    const term = search.trim().toLowerCase();
    if (term.length >= 2) {
      lines = lines.filter((l) =>
        l.username.toLowerCase().includes(term) ||
        (l.clients?.name && l.clients.name.toLowerCase().includes(term)) ||
        (l.clients?.phone && l.clients.phone.includes(term)) ||
        l.platform.includes(term),
      );
    }
    if (platformFilter !== 'all') lines = lines.filter((l) => l.platform === platformFilter);
    if (unlinkedOnly) lines = lines.filter((l) => !l.clients);
    lines.sort((a, b) => {
      if (sortBy === 'days') {
        return (daysUntilExpiry(a.expires_at) ?? 999) - (daysUntilExpiry(b.expires_at) ?? 999);
      }
      if (sortBy === 'platform') return a.platform.localeCompare(b.platform);
      return (a.clients?.name || '').localeCompare(b.clients?.name || '');
    });
    return lines;
  }, [allLines, search, platformFilter, sortBy, unlinkedOnly]);

  const expiringToday = filteredLines.filter((l) => daysUntilExpiry(l.expires_at) === 0);
  const expiringSoon = filteredLines.filter((l) => { const d = daysUntilExpiry(l.expires_at); return d !== null && d > 0 && d <= 3; });
  const expiringLater = filteredLines.filter((l) => { const d = daysUntilExpiry(l.expires_at); return d !== null && d > 3; });

  // ── Estado individual ──
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [postRenewDialog, setPostRenewDialog] = useState<PostRenewData | null>(null);
  const [editLine, setEditLine] = useState<LineWithClient | null>(null);

  // ── Estado bulk ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);

  // ── Estado recordatorios ──
  const [reminderQueueOpen, setReminderQueueOpen] = useState(false);

  const selectionMode = selectedIds.size > 0;
  const unlinkedCount = allLines.filter((l) => !l.clients).length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((lines: LineWithClient[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      lines.forEach((l) => next.add(l.id));
      return next;
    });
  }, []);

  const clearSection = useCallback((lines: LineWithClient[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      lines.forEach((l) => next.delete(l.id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Renovación individual ──
  const handleRenew = useCallback(
    (line: LineWithClient) => {
      setRenewingId(line.id);
      const body: Record<string, unknown> = { action: 'renew' };
      if (line.platform === 'clicktv') body.package_id = line.package_id || 4;
      else body.months = 1;

      // Leer ajustes; si aún no cargaron, default = activado
      const doSend = appConfig?.auto_send_on_renew !== false;
      const doCopy = appConfig?.auto_copy_on_renew !== false;

      lineAction.mutate(
        { platform: line.platform, lineId: line.id, method: 'PATCH', body },
        {
          onSuccess: () => {
            refetch();
            const tpl = selectBestTemplate(templates, line.platform, 'expiry');
            if (tpl) {
              renderTpl.mutate(
                { templateId: tpl, lineId: line.id },
                {
                  onSuccess: (r) => {
                    if (doCopy) navigator.clipboard.writeText(r.rendered).catch(() => {});
                    if (doSend) openWhatsApp(r.whatsapp_url);
                    setPostRenewDialog({
                      line,
                      rendered: r.rendered,
                      waUrl: r.whatsapp_url,
                      autoCopied: doCopy,
                      autoWhatsApp: doSend,
                    });
                  },
                  onError: () => toast.success('¡Renovada!'),
                },
              );
            } else {
              toast.success('¡Renovada!');
            }
          },
          onError: (e: Error) => toast.error(e.message),
          onSettled: () => setRenewingId(null),
        },
      );
    },
    [lineAction, renderTpl, refetch, templates, appConfig],
  );

  // ── Renovación masiva ──
  const handleBulkRenew = useCallback(async () => {
    const lines = allLines.filter((l) => selectedIds.has(l.id));
    if (!lines.length) return;

    setBulkRenewing(true);
    setBulkProgress({ done: 0, total: lines.length });
    const results: BulkResult[] = [];

    for (const line of lines) {
      const body: Record<string, unknown> = { action: 'renew' };
      if (line.platform === 'clicktv') body.package_id = line.package_id || 4;
      else body.months = 1;

      try {
        await lineAction.mutateAsync({ platform: line.platform, lineId: line.id, method: 'PATCH', body });
        let rendered: string | null = null;
        let waUrl: string | null = null;
        const tpl = selectBestTemplate(templates, line.platform, 'expiry');
        if (tpl) {
          try {
            const r = await renderTpl.mutateAsync({ templateId: tpl, lineId: line.id });
            rendered = r.rendered;
            waUrl = r.whatsapp_url || null;
          } catch { /* render failure is non-fatal */ }
        }
        results.push({ line, success: true, rendered, waUrl, error: null });
      } catch (e: unknown) {
        results.push({ line, success: false, rendered: null, waUrl: null, error: (e as Error).message });
      }

      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    refetch();
    setBulkRenewing(false);
    clearSelection();
    setBulkResults(results);
  }, [allLines, selectedIds, lineAction, renderTpl, refetch, templates, clearSelection]);

  // ── Copiar mensaje ──
  const handleCopy = useCallback(
    (line: LineWithClient) => {
      setCopyingId(line.id);
      const tpl = selectBestTemplate(templates, line.platform, 'expiry');
      if (!tpl) { toast.error('No hay plantilla disponible'); setCopyingId(null); return; }
      renderTpl.mutate(
        { templateId: tpl, lineId: line.id },
        {
          onSuccess: (r) => { copyText(r.rendered); setCopyingId(null); },
          onError: () => setCopyingId(null),
        },
      );
    },
    [renderTpl, templates],
  );

  // ── WhatsApp individual ──
  const handleWhatsApp = useCallback(
    (line: LineWithClient) => {
      const tpl = selectBestTemplate(templates, line.platform, 'expiry');
      if (!tpl) { toast.error('No hay plantilla disponible'); return; }
      renderTpl.mutate(
        { templateId: tpl, lineId: line.id },
        { onSuccess: (r) => openWhatsApp(r.whatsapp_url) },
      );
    },
    [renderTpl, templates],
  );

  const clearFilters = () => {
    setSearch(''); setPlatformFilter('all'); setSortBy('days'); setUnlinkedOnly(false);
  };
  const hasFilters = !!(search || platformFilter !== 'all' || sortBy !== 'days' || unlinkedOnly);

  return (
    <>
      <Topbar
        title="Vencimientos"
        subtitle={isLoading ? 'Cargando…' : `${allLines.length} líneas por vencer`}
      />

      {/* ── Modals ── */}
      {postRenewDialog && (
        <PostRenewDialog data={postRenewDialog} onClose={() => setPostRenewDialog(null)} />
      )}
      {bulkResults && (
        <BulkResultsModal results={bulkResults} onClose={() => setBulkResults(null)} />
      )}
      {reminderQueueOpen && (
        <ReminderQueueModal
          lines={expiringToday}
          templates={templates}
          onClose={() => setReminderQueueOpen(false)}
        />
      )}

      <div className="px-3 md:px-8 py-4 md:py-6 max-w-5xl space-y-4 md:space-y-6">
        {/* ── Stats ── */}
        {!isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-danger-soft rounded-2xl border border-danger/20 p-3 md:p-5 flex items-center gap-3 animate-fade-in">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 md:h-6 md:w-6 text-danger" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-display font-bold text-danger">{expiringToday.length}</div>
                <div className="text-xs font-semibold text-danger/80">Hoy</div>
              </div>
            </div>
            <div className="bg-warning-soft rounded-2xl border border-warning/20 p-3 md:p-5 flex items-center gap-3 animate-fade-in stagger-1">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 md:h-6 md:w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-display font-bold text-warning">{expiringSoon.length}</div>
                <div className="text-xs font-semibold text-warning/80">Próx. 3d</div>
              </div>
            </div>
            <div className="bg-info-soft rounded-2xl border border-info/20 p-3 md:p-5 flex items-center gap-3 animate-fade-in stagger-2">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 md:h-6 md:w-6 text-info" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-display font-bold text-info">{expiringLater.length}</div>
                <div className="text-xs font-semibold text-info/80">4-7 días</div>
              </div>
            </div>
            <div className="bg-bg-elevated rounded-2xl border border-border p-3 md:p-5 flex items-center gap-3 animate-fade-in stagger-3">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-clicktv-500/10 flex items-center justify-center shrink-0">
                <Filter className="h-4 w-4 md:h-6 md:w-6 text-clicktv-500" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-display font-bold text-fg">{filteredLines.length}</div>
                <div className="text-xs font-semibold text-fg-muted">Mostrando</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Barra de filtros ── */}
        <div className="bg-bg-elevated rounded-2xl border border-border shadow-card p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
            <Input
              placeholder="Buscar por username, cliente, teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-bg-muted text-fg-subtle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Fila 1: plataforma + sin cliente */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-fg-muted flex items-center gap-1 shrink-0">
                <SlidersHorizontal className="h-3 w-3" /> Plataforma:
              </span>
              {(['all', 'clicktv', 'raptor'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                    platformFilter === p
                      ? p === 'clicktv'
                        ? 'bg-clicktv-500/10 text-clicktv-500 border-clicktv-500/20'
                        : p === 'raptor'
                          ? 'bg-raptor-500/10 text-raptor-500 border-raptor-500/20'
                          : 'bg-bg-muted text-fg border-border'
                      : 'bg-bg text-fg-muted border-border hover:bg-bg-muted',
                  )}
                >
                  {p === 'all' ? 'Todas' : p === 'clicktv' ? 'ClickTV' : 'Raptor'}
                </button>
              ))}
              <button
                onClick={() => setUnlinkedOnly((v) => !v)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5',
                  unlinkedOnly
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-bg text-fg-muted border-border hover:bg-bg-muted',
                )}
              >
                <UserX className="h-3 w-3" />
                Sin cliente
                {unlinkedCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    unlinkedOnly ? 'bg-warning/20 text-warning' : 'bg-bg-muted text-fg-subtle',
                  )}>
                    {unlinkedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Fila 2: ordenar + limpiar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-fg-muted shrink-0">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'days' | 'platform' | 'client')}
                className="text-xs font-bold bg-bg rounded-lg border border-border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                <option value="days">Días restantes</option>
                <option value="platform">Plataforma</option>
                <option value="client">Cliente</option>
              </select>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs font-bold text-danger hover:opacity-70 transition-opacity"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Bulk renewing progress ── */}
        {bulkRenewing && (
          <div className="bg-bg-elevated border border-accent/20 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
            <RefreshCw className="h-5 w-5 text-accent animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-bold text-fg">Renovando líneas…</div>
              <div className="text-xs text-fg-muted mt-0.5">{bulkProgress.done} de {bulkProgress.total} completadas</div>
            </div>
            <div className="w-24 bg-bg rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Vencen hoy ── */}
        <div>
          <SectionHeader
            icon={<AlertTriangle className="h-4 w-4 text-danger" />}
            label="Vencen hoy"
            count={expiringToday.length}
            lines={expiringToday}
            selectedIds={selectedIds}
            onSelectAll={selectAll}
            onClearSection={clearSection}
            reminderButton={
              expiringToday.length > 0 ? (
                <button
                  onClick={() => setReminderQueueOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/20 transition-all"
                >
                  <Bell className="h-3 w-3" />
                  Recordatorios ({expiringToday.length})
                </button>
              ) : undefined
            }
          />

          {isLoading ? (
            <LoadingState />
          ) : expiringToday.length === 0 ? (
            <EmptyState
              icon={<CalendarX className="h-10 w-10 text-fg-subtle" />}
              title="Ninguna línea vence hoy"
              description={hasFilters ? 'Probá cambiando los filtros.' : 'Todas las líneas están al día. Excelente trabajo.'}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {expiringToday.map((line) => (
                <ExpiringCard
                  key={line.id}
                  line={line}
                  isToday
                  onRenew={handleRenew}
                  onCopy={handleCopy}
                  onWhatsApp={handleWhatsApp}
                  onEdit={setEditLine}
                  renewing={renewingId === line.id}
                  copying={copyingId === line.id}
                  selected={selectedIds.has(line.id)}
                  onToggleSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Próximos 3 días ── */}
        {expiringSoon.length > 0 && (
          <div>
            <SectionHeader
              icon={<Clock className="h-4 w-4 text-warning" />}
              label="Próximos 3 días"
              count={expiringSoon.length}
              lines={expiringSoon}
              selectedIds={selectedIds}
              onSelectAll={selectAll}
              onClearSection={clearSection}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {expiringSoon.map((line) => (
                <ExpiringCard
                  key={line.id}
                  line={line}
                  isToday={false}
                  onRenew={handleRenew}
                  onCopy={handleCopy}
                  onWhatsApp={handleWhatsApp}
                  onEdit={setEditLine}
                  renewing={renewingId === line.id}
                  copying={copyingId === line.id}
                  selected={selectedIds.has(line.id)}
                  onToggleSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 4-7 días ── */}
        {expiringLater.length > 0 && (
          <div>
            <SectionHeader
              icon={<Zap className="h-4 w-4 text-info" />}
              label="Próximos 4-7 días"
              count={expiringLater.length}
              lines={expiringLater}
              selectedIds={selectedIds}
              onSelectAll={selectAll}
              onClearSection={clearSection}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {expiringLater.map((line) => (
                <ExpiringCard
                  key={line.id}
                  line={line}
                  isToday={false}
                  onRenew={handleRenew}
                  onCopy={handleCopy}
                  onWhatsApp={handleWhatsApp}
                  onEdit={setEditLine}
                  renewing={renewingId === line.id}
                  copying={copyingId === line.id}
                  selected={selectedIds.has(line.id)}
                  onToggleSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Link
            href="/lines?status=expiring"
            className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-clicktv-500 transition-colors"
          >
            Ver todas las líneas por vencer
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Barra flotante de selección masiva ── */}
      {selectionMode && !bulkRenewing && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 flex items-center gap-3 bg-bg-elevated border border-accent/20 rounded-2xl shadow-2xl px-4 py-3 animate-fade-in">
          <span className="text-sm font-bold text-fg whitespace-nowrap">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBulkRenew}
            loading={bulkRenewing}
            className="bg-gradient-to-r from-accent to-accent/80 whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            Renovar {selectedIds.size}
          </Button>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-muted hover:text-fg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sheet: editar línea */}
      <EditLineSheet line={editLine} onClose={() => setEditLine(null)} />
    </>
  );
}
