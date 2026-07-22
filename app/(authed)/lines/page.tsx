'use client';

import { Topbar } from '@/components/layout/Topbar';
import { LineSharesSection } from '@/components/LineSharesSection';
import { useLines, useLineAction, useTemplates, useRenderTemplate, useClients, useAssignLineClient } from '@/lib/hooks';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Sheet } from '@/components/ui/Sheet';
import { StatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { expiryLabel } from '@/lib/utils/dates';
import { selectBestTemplate } from '@/lib/utils/templates';
import { openWhatsApp } from '@/lib/utils/whatsapp';
import { CLICKTV_PACKAGES, RAPTOR_DURATIONS } from '@/types';
import {
  Tv, Plus, Search, ChevronLeft, ChevronRight, Copy,
  RefreshCw, Key, Trash2, Ban, Play, MessageSquare, ExternalLink,
  Download, ArrowUpRight, CheckCircle, UserPlus, UserCheck, UserMinus, Users, Pencil,
} from 'lucide-react';
import { EditLineSheet } from '@/components/EditLineSheet';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copiado'));
}

// ── CSV export ──
function downloadCsv(rows: (string | number | null)[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportLinesToCsv(lines: any[]) {
  const headers = ['Usuario', 'Contraseña', 'Plataforma', 'Estado', 'Paquete', 'Pantallas', 'Vencimiento', 'Cliente', 'Teléfono'];
  const rows = lines.map((l) => [
    l.username,
    l.password,
    l.platform,
    l.status,
    l.package_label,
    l.screens,
    l.expires_at ? l.expires_at.slice(0, 10) : '',
    l.clients?.name || '',
    l.clients?.phone || '',
  ]);
  downloadCsv([headers, ...rows], `lineas-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`${lines.length} líneas exportadas`);
}

// ── Sheet: asignar cliente a una línea ──
function AssignClientSheet({ line, onClose }: { line: any | null; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const assignClient = useAssignLineClient();
  const { data: clientsData } = useClients(search || undefined);
  const clients = clientsData?.clients || [];

  const handleAssign = (clientId: string) => {
    if (!line) return;
    assignClient.mutate({ lineId: line.id, clientId }, { onSuccess: onClose });
  };

  const handleUnassign = () => {
    if (!line) return;
    assignClient.mutate({ lineId: line.id, clientId: null }, { onSuccess: onClose });
  };

  return (
    <Sheet
      open={!!line}
      onClose={onClose}
      title={line ? `Vincular cliente` : ''}
      subtitle={line ? line.username : ''}
    >
      {line && (
        <div className="p-6 space-y-6">
          {line.clients && (
            <div>
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide mb-2">Cliente actual</p>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-clicktv-500/5 border border-clicktv-500/20">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-fg">{line.clients.name || 'Sin nombre'}</div>
                  {line.clients.phone && <div className="text-xs text-fg-subtle mt-0.5">{line.clients.phone}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={handleUnassign} loading={assignClient.isPending}>
                  <UserMinus className="h-3.5 w-3.5" /> Desvincular
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide">
              {line.clients ? 'Cambiar a otro cliente' : 'Buscar y vincular cliente'}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
              <Input
                placeholder="Nombre o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {clients.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="Sin resultados" />
            ) : (
              <div className="space-y-2">
                {clients.map((client) => {
                  const isCurrent = line.clients?.id === client.id;
                  return (
                    <div key={client.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${isCurrent ? 'border-clicktv-500/30 bg-clicktv-500/5' : 'border-border bg-bg hover:bg-bg-muted'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-fg">{client.name || 'Sin nombre'}</div>
                        {client.phone && <div className="text-xs text-fg-subtle">{client.phone}</div>}
                        <div className="text-xs text-fg-muted mt-0.5">
                          {client.active_lines} línea{client.active_lines !== 1 ? 's' : ''} activa{client.active_lines !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs font-semibold text-clicktv-500 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> Vinculado
                        </span>
                      ) : (
                        <Button size="sm" variant="primary" onClick={() => handleAssign(client.id)} loading={assignClient.isPending}>
                          Vincular
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ── Card de línea ──
function LineCard({ line, onAction, onAssign, onEdit }: { line: any; onAction: (line: any, action: string) => void; onAssign: (line: any) => void; onEdit: (line: any) => void }) {
  const isDemo = line.status === 'demo';

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-card p-5 space-y-4 transition-all hover:shadow-card-hover">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={line.platform} />
          <StatusBadge status={line.status} />
        </div>
        <span className="text-xs font-medium text-fg-subtle whitespace-nowrap">
          {expiryLabel(line.expires_at)}
        </span>
      </div>

      {/* Demo → Pago banner */}
      {isDemo && (
        <button
          onClick={() => onAction(line, 'convert')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20 transition-all text-xs font-bold"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Convertir a cuenta paga
        </button>
      )}

      {/* Datos */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => copyText(line.username)}
          className="text-left bg-bg rounded-xl p-3 border border-border hover:border-clicktv-500/30 transition-all group"
        >
          <div className="text-[10px] font-semibold text-fg-subtle mb-0.5 flex items-center justify-between uppercase tracking-wide">
            Usuario <Copy className="h-3 w-3 opacity-40 group-hover:opacity-100" />
          </div>
          <div className="text-sm font-semibold truncate">{line.username}</div>
        </button>
        <button
          onClick={() => line.password && copyText(line.password)}
          disabled={!line.password}
          className="text-left bg-bg rounded-xl p-3 border border-border hover:border-clicktv-500/30 transition-all disabled:opacity-40 group"
        >
          <div className="text-[10px] font-semibold text-fg-subtle mb-0.5 flex items-center justify-between uppercase tracking-wide">
            Contraseña <Copy className="h-3 w-3 opacity-40 group-hover:opacity-100" />
          </div>
          <div className="text-sm font-semibold truncate">{line.password || '—'}</div>
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {line.package_label && <span className="bg-bg rounded-lg px-2 py-1 border border-border text-fg-subtle font-medium">{line.package_label}</span>}
        <button
          onClick={() => onAssign(line)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all font-semibold ${
            line.clients
              ? 'text-clicktv-500 border-clicktv-500/20 bg-clicktv-500/5 hover:bg-clicktv-500/10'
              : 'text-fg-subtle border-dashed border-border hover:border-clicktv-500/40 hover:text-clicktv-500'
          }`}
        >
          {line.clients ? (
            <><UserCheck className="h-3 w-3 shrink-0" />{line.clients.name || line.clients.phone || 'Ver cliente'}</>
          ) : (
            <><UserPlus className="h-3 w-3 shrink-0" />Sin vincular</>
          )}
        </button>
      </div>

      {/* Pantallas compartidas */}
      <LineSharesSection lineId={line.id} totalScreens={line.screens} />

      {/* Acciones */}
      <div className="grid grid-cols-6 gap-2 pt-2 border-t border-border">
        <button
          onClick={() => onAction(line, 'renew')}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-[10px] font-bold">Renovar</span>
        </button>
        <button
          onClick={() => onAction(line, 'reset_password')}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-raptor-500/10 text-raptor-500 hover:bg-raptor-500/20 transition-colors"
        >
          <Key className="h-4 w-4" />
          <span className="text-[10px] font-bold">Pass</span>
        </button>
        <button
          onClick={() => onEdit(line)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          <span className="text-[10px] font-bold">Editar</span>
        </button>
        <button
          onClick={() => onAction(line, line.status === 'blocked' ? 'unblock' : 'block')}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
        >
          {line.status === 'blocked' ? <Play className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          <span className="text-[10px] font-bold">{line.status === 'blocked' ? 'Activar' : 'Bloquear'}</span>
        </button>
        <button
          onClick={() => onAction(line, 'message')}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-clicktv-500/10 text-clicktv-500 hover:bg-clicktv-500/20 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-[10px] font-bold">Mensaje</span>
        </button>
        <button
          onClick={() => onAction(line, 'delete')}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[10px] font-bold">Eliminar</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ──
export default function LinesPage() {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useLines({
    search: search || undefined,
    platform: platform || undefined,
    status: status || undefined,
    sort,
    page,
  });
  const lineAction = useLineAction();
  const { data: tplData } = useTemplates();
  const renderTpl = useRenderTemplate();

  const lines = data?.lines || [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const templates = tplData?.templates || [];

  const [assignLine, setAssignLine] = useState<any>(null);
  const [editLine, setEditLine] = useState<any>(null);
  const [activeLine, setActiveLine] = useState<any>(null);
  const [dialogAction, setDialogAction] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState(5);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [renderedMsg, setRenderedMsg] = useState<{ text: string; waUrl: string } | null>(null);
  const [changePass, setChangePass] = useState(false);

  const closeDialog = () => {
    setActiveLine(null);
    setDialogAction(null);
    setRenderedMsg(null);
    setChangePass(false);
  };

  const handleAction = (line: any, action: string) => {
    if (action === 'delete') {
      if (!confirm(`¿Eliminar la línea "${line.username}"? Esta acción no se puede deshacer.`)) return;
      lineAction.mutate(
        { platform: line.platform, lineId: line.id, method: 'DELETE' },
        {
          onSuccess: () => { toast.success('Línea eliminada'); refetch(); },
          onError: (e: any) => toast.error(e.message),
        },
      );
      return;
    }

    if (action === 'block' || action === 'unblock') {
      const apiAction = line.platform === 'raptor'
        ? action
        : (action === 'block' ? 'disable' : 'enable');
      lineAction.mutate(
        { platform: line.platform, lineId: line.id, method: 'PATCH', body: { action: apiAction } },
        {
          onSuccess: () => { toast.success(action === 'block' ? 'Bloqueada' : 'Desbloqueada'); refetch(); },
          onError: (e: any) => toast.error(e.message),
        },
      );
      return;
    }

    if (action === 'message') {
      const tpl = selectBestTemplate(templates, line.platform, 'message');
      setSelectedTemplate(tpl);
      setRenderedMsg(null);
      setActiveLine(line);
      setDialogAction('message');
      return;
    }

    // convert = same as renew but forced to paid packages
    if (action === 'convert') {
      setActiveLine(line);
      setDialogAction('renew');
      setChangePass(false);
      if (line.platform === 'clicktv') setSelectedPkg(5); // default 1 mes 4 pantallas
      else setSelectedMonths(1);
      return;
    }

    setActiveLine(line);
    setDialogAction(action);
    setChangePass(false);
    if (line.package_id) setSelectedPkg(line.package_id);
  };

  const executeAction = () => {
    if (!activeLine || !dialogAction) return;
    const actualAction = dialogAction === 'renew' && changePass ? 'renew_pass' : dialogAction;
    const body: any = { action: actualAction };
    if ((actualAction === 'renew' || actualAction === 'renew_pass') && activeLine.platform === 'clicktv') body.package_id = selectedPkg;
    if ((actualAction === 'renew' || actualAction === 'renew_pass') && activeLine.platform === 'raptor') body.months = selectedMonths;

    lineAction.mutate(
      { platform: activeLine.platform, lineId: activeLine.id, method: 'PATCH', body },
      {
        onSuccess: (res) => {
          const pwd = res.password ? ` · Nueva pass: ${res.password}` : '';
          toast.success(`Listo${pwd}`);
          refetch();
          if (dialogAction === 'renew') {
            const tpl = selectBestTemplate(templates, activeLine.platform, 'renew');
            setSelectedTemplate(tpl);
            setRenderedMsg(null);
            setDialogAction('message');
            setChangePass(false);
            if (tpl) {
              renderTpl.mutate(
                { templateId: tpl, lineId: activeLine.id },
                {
                  onSuccess: (r) => {
                    setRenderedMsg({ text: r.rendered, waUrl: r.whatsapp_url });
                    navigator.clipboard.writeText(r.rendered).catch(() => {});
                    openWhatsApp(r.whatsapp_url);
                  },
                },
              );
            }
          } else {
            closeDialog();
          }
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const generateMessage = () => {
    if (!selectedTemplate || !activeLine) return;
    renderTpl.mutate(
      { templateId: selectedTemplate, lineId: activeLine.id },
      {
        onSuccess: (res) => {
          setRenderedMsg({ text: res.rendered, waUrl: res.whatsapp_url });
          navigator.clipboard.writeText(res.rendered).catch(() => {});
        },
      },
    );
  };

  // ── CSV: fetch all lines with current filters ──
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      params.set('limit', '500');
      const res = await fetch(`/api/lines?${params}`);
      const d = await res.json();
      exportLinesToCsv(d.lines || []);
    } catch {
      toast.error('Error al exportar');
    }
  };

  return (
    <>
      <Topbar
        title="Líneas"
        subtitle={isLoading ? 'Cargando…' : `${total} línea${total !== 1 ? 's' : ''}`}
      />

      <div className="px-5 md:px-8 py-6 max-w-7xl space-y-5">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
            <Input
              placeholder="Buscar username…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <Select value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }} className="w-full sm:w-36">
            <option value="">Plataforma</option>
            <option value="clicktv">ClickTV</option>
            <option value="raptor">Raptor</option>
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full sm:w-40">
            <option value="">Estado</option>
            <option value="active">Activa</option>
            <option value="expiring">Por vencer</option>
            <option value="expired">Vencida</option>
            <option value="blocked">Bloqueada</option>
            <option value="demo">Demo</option>
          </Select>
          <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="w-full sm:w-48">
            <option value="expires_at_asc">Vence pronto</option>
            <option value="expires_at_desc">Vence tarde</option>
            <option value="username_asc">Usuario (A-Z)</option>
            <option value="username_desc">Usuario (Z-A)</option>
            <option value="created_at_desc">Creado reciente</option>
          </Select>
          <Button variant="secondary" size="md" onClick={handleExportCsv} title="Exportar a CSV">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="primary" size="md" className="w-full sm:w-auto" asChild>
            <Link href="/lines/new"><Plus className="h-4 w-4" /> Nueva</Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : lines.length === 0 ? (
          <EmptyState icon={<Tv className="h-10 w-10" />} title="Sin líneas" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lines.map((l: any) => (
                <LineCard
                  key={l.id}
                  line={l}
                  onAction={handleAction}
                  onAssign={(line) => setAssignLine(line)}
                  onEdit={(line) => setEditLine(line)}
                />
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-fg-subtle font-medium">
                  Página {page} de {pages} · {total} líneas
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog: Renovar / Convertir / Cambiar contraseña */}
      <Dialog
        open={!!activeLine && (dialogAction === 'renew' || dialogAction === 'reset_password')}
        onClose={closeDialog}
        title={activeLine?.status === 'demo' && dialogAction === 'renew'
          ? 'Convertir demo a pago'
          : dialogAction === 'renew' ? 'Renovar línea' : 'Cambiar contraseña'
        }
      >
        {activeLine && (
          <div className="space-y-4 mt-4">
            <div className="text-xs text-fg-muted bg-bg rounded-lg px-3 py-2 border border-border flex items-center gap-2">
              <span className="font-semibold">{activeLine.username}</span>
              <PlatformBadge platform={activeLine.platform} />
            </div>
            {dialogAction === 'reset_password' && (
              <p className="text-sm text-fg-muted">Se generará una nueva contraseña automáticamente.</p>
            )}
            {dialogAction === 'renew' && activeLine.platform === 'clicktv' && (
              <div>
                <label className="label">Paquete</label>
                <Select value={selectedPkg} onChange={(e) => setSelectedPkg(Number(e.target.value))}>
                  {CLICKTV_PACKAGES.filter((p) => !p.is_trial).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.credits} crédito{p.credits > 1 ? 's' : ''})</option>
                  ))}
                </Select>
              </div>
            )}
            {dialogAction === 'renew' && activeLine.platform === 'raptor' && (
              <div>
                <label className="label">Duración</label>
                <Select value={selectedMonths} onChange={(e) => setSelectedMonths(Number(e.target.value))}>
                  {RAPTOR_DURATIONS.map((d) => (
                    <option key={d.months} value={d.months}>{d.label}</option>
                  ))}
                </Select>
              </div>
            )}
            {dialogAction === 'renew' && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={changePass}
                  onChange={(e) => setChangePass(e.target.checked)}
                  className="rounded border-border accent-clicktv-500"
                />
                <span className="text-fg-muted">Cambiar contraseña también</span>
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="primary" loading={lineAction.isPending} onClick={executeAction}>Confirmar</Button>
              <Button variant="ghost" onClick={closeDialog}>Cancelar</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Sheet: asignar cliente */}
      <AssignClientSheet line={assignLine} onClose={() => setAssignLine(null)} />

      {/* Sheet: editar línea */}
      <EditLineSheet line={editLine} onClose={() => setEditLine(null)} />

      {/* Dialog: Mensaje WhatsApp */}
      <Dialog open={!!activeLine && dialogAction === 'message'} onClose={closeDialog} title="Mensaje para el cliente">
        {activeLine && (
          <div className="space-y-4 mt-4">
            <div className="text-xs text-fg-muted bg-bg rounded-lg px-3 py-2 border border-border font-semibold">{activeLine.username}</div>
            {!renderedMsg && (
              <>
                <div>
                  <label className="label">Plantilla</label>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => { setSelectedTemplate(e.target.value); setRenderedMsg(null); }}
                  >
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>
                {renderTpl.isPending ? (
                  <div className="text-sm text-fg-muted animate-pulse py-1">Generando mensaje…</div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={generateMessage}>
                    Generar mensaje
                  </Button>
                )}
              </>
            )}
            {renderedMsg && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/8 border border-success/20 text-success text-xs font-semibold">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Mensaje copiado al portapapeles
                </div>
                <div className="bg-bg rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border max-h-52 overflow-y-auto">
                  {renderedMsg.text}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => copyText(renderedMsg.text)}>
                    <Copy className="h-3.5 w-3.5" /> Copiar de nuevo
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openWhatsApp(renderedMsg.waUrl)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
