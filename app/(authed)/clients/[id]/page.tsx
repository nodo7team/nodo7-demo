'use client';

import { cn } from '@/lib/utils/cn';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Sheet } from '@/components/ui/Sheet';
import { StatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import {
  useClient, useLineAction, useTemplates, useRenderTemplate, useUpdateClient,
  useLinkLine, useUnlinkLine, useLines, useCreateLine, useDeleteLineShare,
} from '@/lib/hooks';
import { EditLineSheet } from '@/components/EditLineSheet';
import { LineSharesSection } from '@/components/LineSharesSection';
import { formatExpiry, expiryLabel } from '@/lib/utils/dates';
import { selectBestTemplate } from '@/lib/utils/templates';
import { openWhatsApp, whatsAppChatUrl } from '@/lib/utils/whatsapp';
import { generateUsername, generatePassword, generateRaptorEmail } from '@/lib/utils/generators';
import { CLICKTV_PACKAGES, RAPTOR_DURATIONS } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Key, Trash2, Ban, Play, MessageSquare, Copy,
  ExternalLink, Phone, Edit2, Save, Link2Off, Plus, Search, Tv,
  Zap, RotateCcw, CheckCircle, XCircle, Activity, CheckCheck,
  Users, Share2, Pencil,
} from 'lucide-react';

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create_paid:    { label: 'Alta pago',      icon: Plus,       color: 'text-success' },
  create_demo:    { label: 'Alta demo',       icon: Zap,        color: 'text-warning' },
  renew:          { label: 'Renovación',      icon: RefreshCw,  color: 'text-clicktv-500' },
  renew_pass:     { label: 'Renov. + pass',   icon: RefreshCw,  color: 'text-clicktv-500' },
  reset_password: { label: 'Reset password',  icon: Key,        color: 'text-raptor-500' },
  disable:        { label: 'Bloqueada',       icon: Ban,        color: 'text-danger' },
  enable:         { label: 'Desbloqueada',    icon: Play,       color: 'text-success' },
  block:          { label: 'Bloqueada',       icon: Ban,        color: 'text-danger' },
  unblock:        { label: 'Desbloqueada',    icon: Play,       color: 'text-success' },
  delete:         { label: 'Eliminada',       icon: Trash2,     color: 'text-danger' },
  sync:           { label: 'Sincronización',  icon: RotateCcw,  color: 'text-fg-muted' },
};

function ActionButton({ icon: Icon, label, color, onClick, loading }: any) {
  const colorMap: Record<string, string> = {
    success: 'bg-success-soft text-success-subtle hover:bg-success-soft',
    warning: 'bg-warning-soft text-warning-subtle hover:bg-warning-soft',
    info:    'bg-raptor-500/10 text-raptor-500 hover:bg-raptor-500/20',
    danger:  'bg-danger-soft text-danger-subtle hover:bg-danger-soft',
    accent:  'bg-clicktv-500/10 text-clicktv-500 hover:bg-clicktv-500/20',
    muted:   'bg-bg-muted text-fg hover:bg-bg-muted',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none min-w-0',
        colorMap[color] || colorMap.muted,
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-bold leading-tight text-center">{label}</span>
    </button>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = useClient(id);
  const lineAction = useLineAction();
  const updateClient = useUpdateClient();
  const linkLine = useLinkLine(id);
  const unlinkLine = useUnlinkLine(id);
  const deleteShare = useDeleteLineShare();
  const { data: tplData } = useTemplates();
  const renderTpl = useRenderTemplate();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [dialog, setDialog] = useState<{
    type: 'action' | 'message' | null;
    lineId?: string;
    platform?: 'clicktv' | 'raptor';
    action?: string;
  }>({ type: null });
  const [selectedPkg, setSelectedPkg] = useState<number>(5);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [renderedMsg, setRenderedMsg] = useState<{ text: string; waUrl: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Editar línea localmente
  const [editLine, setEditLine] = useState<any>(null);

  // Asignar línea
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignPlatform, setAssignPlatform] = useState('');
  const [assignStatus, setAssignStatus] = useState('');
  const { data: unlinkedData, isLoading: unlinkedLoading } = useLines({
    unlinked: true,
    search: assignSearch || undefined,
    platform: assignPlatform || undefined,
    status: assignStatus || undefined,
  });
  const unlinkedLines = unlinkedData?.lines || [];

  // Crear línea
  const createLine = useCreateLine();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPlatform, setCreatePlatform] = useState<'clicktv' | 'raptor'>('clicktv');
  const [createNameHint, setCreateNameHint] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPackageId, setCreatePackageId] = useState(5);
  const [createRaptorMonths, setCreateRaptorMonths] = useState(1);
  const [createIsDemo, setCreateIsDemo] = useState(false);

  useEffect(() => {
    if (createPlatform === 'clicktv') {
      setCreateUsername(generateUsername(createNameHint || 'cliente'));
      setCreatePassword(generatePassword(8));
    } else {
      setCreateUsername(generateRaptorEmail(createNameHint || 'cliente'));
      setCreatePassword('123456');
    }
  }, [createPlatform, createNameHint]);

  if (isLoading) return <><Topbar title="Cargando…" /><LoadingState /></>;
  if (!data?.client) return <><Topbar title="No encontrado" /><div className="p-8 text-fg-muted">Cliente no encontrado</div></>;

  const { client, lines, logs, shared_lines } = data;

  // Unificar líneas propias + compartidas en una sola lista
  const primaryIds = new Set((lines || []).map((l: any) => l.id));
  const allLines: any[] = [
    ...(lines || []).map((l: any) => ({ ...l, _isShared: false })),
    ...(shared_lines || [])
      .filter((s: any) => s.lines && !primaryIds.has(s.lines.id))
      .map((s: any) => ({
        ...s.lines,
        _isShared: true,
        _sharedScreens: s.screens,
        _shareId: s.id,
        _shareNotes: s.notes,
      })),
  ];
  const templates = tplData?.templates || [];

  const startEdit = () => {
    setEditName(client.name || '');
    setEditPhone(client.phone || '');
    setEditNotes(client.notes || '');
    setEditing(true);
  };

  const saveEdit = () => {
    updateClient.mutate(
      { id: client.id, name: editName, phone: editPhone, notes: editNotes },
      { onSuccess: () => { setEditing(false); refetch(); } },
    );
  };

  const executeAction = async (lineId: string, platform: 'clicktv' | 'raptor', action: string) => {
    const body: any = { action };
    if ((action === 'renew' || action === 'renew_pass') && platform === 'clicktv') body.package_id = selectedPkg;
    if ((action === 'renew' || action === 'renew_pass') && platform === 'raptor') body.months = selectedMonths;

    lineAction.mutate(
      { platform, lineId, method: 'PATCH', body },
      {
        onSuccess: (res) => {
          const pwd = res.password ? ` · Nueva pass: ${res.password}` : '';
          toast.success(`Listo${pwd}`);
          refetch();
          if (action === 'renew' || action === 'renew_pass') {
            const tpl = selectBestTemplate(templates, platform, 'renew');
            setSelectedTemplate(tpl);
            setRenderedMsg(null);
            setDialog({ type: 'message', lineId, platform });
            if (tpl) {
              renderTpl.mutate(
                { templateId: tpl, lineId },
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
            setDialog({ type: null });
          }
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const deleteLine = async (lineId: string, platform: 'clicktv' | 'raptor') => {
    if (!confirm('¿Eliminar esta línea? No se puede deshacer.')) return;
    lineAction.mutate(
      { platform, lineId, method: 'DELETE' },
      {
        onSuccess: () => { toast.success('Línea eliminada'); refetch(); },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const openMessage = async (lineId: string, platform: 'clicktv' | 'raptor') => {
    const tpl = selectBestTemplate(templates, platform, 'message');
    setSelectedTemplate(tpl);
    setRenderedMsg(null);
    setDialog({ type: 'message', lineId, platform });
  };

  const generateMessage = async () => {
    if (!selectedTemplate || !dialog.lineId) return;
    renderTpl.mutate(
      { templateId: selectedTemplate, lineId: dialog.lineId },
      {
        onSuccess: (res) => {
          setRenderedMsg({ text: res.rendered, waUrl: res.whatsapp_url });
          navigator.clipboard.writeText(res.rendered).catch(() => {});
        },
      },
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado'));
  };

  const handleUnlink = (lineId: string) => {
    if (!confirm('¿Desvincular esta línea del cliente?')) return;
    unlinkLine.mutate(lineId);
  };

  const handleLink = (lineId: string) => {
    linkLine.mutate(lineId, {
      onSuccess: () => setShowAssignSheet(false),
    });
  };

  const regenerateCreateCredentials = () => {
    if (createPlatform === 'clicktv') {
      setCreateUsername(generateUsername(createNameHint || 'cliente'));
      setCreatePassword(generatePassword(8));
    } else {
      setCreateUsername(generateRaptorEmail(createNameHint || 'cliente'));
      setCreatePassword('123456');
    }
  };

  const handleCreateLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.client) return;

    if (createPlatform === 'clicktv') {
      createLine.mutate(
        {
          platform: createPlatform,
          body: {
            package_id: createPackageId,
            username: createUsername,
            password: createPassword,
            is_trial: createIsDemo,
            name_hint: createNameHint,
            client_id: data.client.id,
          },
        },
        {
          onSuccess: () => {
            toast.success('Línea creada y vinculada');
            setShowCreateDialog(false);
            setCreateNameHint('');
            setCreateUsername(generateUsername('cliente'));
            setCreatePassword(generatePassword(8));
            refetch();
          },
          onError: (e: any) => toast.error(e.message),
        },
      );
    } else {
      createLine.mutate(
        {
          platform: createPlatform,
          body: {
            name: createNameHint || 'Cliente',
            email: createUsername,
            password: createPassword,
            months: createRaptorMonths,
            client_id: data.client.id,
          },
        },
        {
          onSuccess: () => {
            toast.success('Línea creada y vinculada');
            setShowCreateDialog(false);
            setCreateNameHint('');
            setCreateUsername(generateRaptorEmail('cliente'));
            refetch();
          },
          onError: (e: any) => toast.error(e.message),
        },
      );
    }
  };

  return (
    <>
      <Topbar title={client.name || 'Sin nombre'} subtitle={client.phone || undefined} />

      <div className="px-5 md:px-8 py-6 max-w-4xl space-y-5">
        {/* Client info card */}
        <div className="bg-bg-elevated rounded-2xl shadow-card p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="label">Nombre</label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div><label className="label">Teléfono</label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
              </div>
              <div><label className="label">Notas</label><textarea className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={saveEdit} loading={updateClient.isPending}><Save className="h-3.5 w-3.5" /> Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-fg">{client.name || 'Sin nombre'}</h2>
                {client.phone && (
                  <a href={whatsAppChatUrl(client.phone)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-clicktv-500 mt-1 hover:underline font-medium">
                    <Phone className="h-3.5 w-3.5" />{client.phone}
                  </a>
                )}
                {client.notes && <p className="text-sm text-fg-muted mt-2">{client.notes}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={startEdit}><Edit2 className="h-3.5 w-3.5" /> Editar</Button>
            </div>
          )}
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              <Tv className="h-4 w-4 text-fg-subtle" />
              Líneas ({allLines.length})
            </h2>
            {!editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setShowCreateDialog(true); regenerateCreateCredentials(); }}>
                  <Plus className="h-3.5 w-3.5" /> Crear línea
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setShowAssignSheet(true); setAssignSearch(''); setAssignPlatform(''); setAssignStatus(''); }}>
                  <Plus className="h-3.5 w-3.5" /> Vincular línea
                </Button>
              </div>
            )}
          </div>
          {allLines.length === 0 ? (
            <div className="bg-bg-elevated rounded-2xl shadow-card p-6 text-center text-sm text-fg-muted">Sin líneas vinculadas</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allLines.map((line: any) => (
                <div key={line._isShared ? `shared-${line._shareId}` : line.id} className="bg-bg-elevated rounded-2xl shadow-card p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <PlatformBadge platform={line.platform} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{line.username}</span>
                          {line._isShared && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-raptor-500/10 text-raptor-500 text-[10px] font-bold">
                              <Share2 className="h-2.5 w-2.5" />
                              {line._sharedScreens} de {line.screens} pant.
                            </span>
                          )}
                        </div>
                        {line.password && <div className="text-xs text-fg-subtle">pass: {line.password}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={line.status} />
                      <span className="text-xs font-medium text-fg-subtle">{expiryLabel(line.expires_at)}</span>
                      <button
                        onClick={() => {
                          if (line._isShared) {
                            if (!confirm('¿Quitar este cliente de la línea compartida?')) return;
                            deleteShare.mutate({ lineId: line.id, shareId: line._shareId });
                          } else {
                            handleUnlink(line.id);
                          }
                        }}
                        disabled={unlinkLine.isPending || deleteShare.isPending}
                        className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-danger transition-colors"
                        title={line._isShared ? 'Quitar de esta línea' : 'Desvincular'}
                      >
                        <Link2Off className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-xs text-fg-subtle">
                    {line.package_label || '—'} · {line.screens} pantalla{line.screens !== 1 ? 's' : ''} · Vence: {formatExpiry(line.expires_at)}
                  </div>

                  <LineSharesSection
                    lineId={line.id}
                    totalScreens={line.screens}
                    prefilledClientId={client.id}
                    prefilledClientName={client.name || undefined}
                    isPrimary={!line._isShared}
                  />

                  {/* Acciones */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2 border-t border-border">
                    <ActionButton icon={RefreshCw} label="Renovar" color="success"
                      onClick={() => { setSelectedPkg(line.package_id || 5); setDialog({ type: 'action', lineId: line.id, platform: line.platform, action: 'renew' }); }} />
                    <ActionButton icon={Key} label="Renov+Pass" color="warning"
                      onClick={() => { setSelectedPkg(line.package_id || 5); setDialog({ type: 'action', lineId: line.id, platform: line.platform, action: 'renew_pass' }); }} />
                    <ActionButton icon={Key} label="Reset Pass" color="info"
                      onClick={() => executeAction(line.id, line.platform, 'reset_password')} loading={lineAction.isPending} />
                    <ActionButton icon={Pencil} label="Editar" color="accent"
                      onClick={() => setEditLine(line)} />
                    <ActionButton
                      icon={line.status === 'blocked' ? Play : Ban}
                      label={line.status === 'blocked' ? 'Activar' : 'Bloquear'}
                      color={line.status === 'blocked' ? 'success' : 'muted'}
                      onClick={() => executeAction(line.id, line.platform, line.status === 'blocked' ? (line.platform === 'raptor' ? 'unblock' : 'enable') : (line.platform === 'raptor' ? 'block' : 'disable'))}
                      loading={lineAction.isPending}
                    />
                    <ActionButton icon={MessageSquare} label="Mensaje" color="accent"
                      onClick={() => openMessage(line.id, line.platform)} />
                    <ActionButton icon={Trash2} label="Eliminar" color="danger"
                      onClick={() => deleteLine(line.id, line.platform)} loading={lineAction.isPending} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History log */}
        {logs && logs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-fg-subtle" />
              <h2 className="text-sm font-bold text-fg">Historial reciente</h2>
              <span className="text-xs text-fg-subtle ml-auto">{logs.length} acciones</span>
            </div>
            <div className="bg-bg-elevated rounded-2xl shadow-card divide-y divide-border max-h-72 overflow-y-auto">
              {logs.map((log: any) => {
                const meta = ACTION_META[log.action] || { label: log.action, icon: Activity, color: 'text-fg-muted' };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className={cn('px-5 py-3 flex items-center gap-3 text-xs', !log.success && 'bg-danger/3')}>
                    <div className={cn('shrink-0', meta.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-fg min-w-[120px]">{meta.label}</span>
                    {log.platform && <PlatformBadge platform={log.platform} />}
                    {log.error_message && (
                      <span className="text-danger truncate flex-1">{log.error_message}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {log.success
                        ? <CheckCircle className="h-3 w-3 text-success" />
                        : <XCircle className="h-3 w-3 text-danger" />
                      }
                      <span className="text-fg-subtle whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sheet: Vincular línea */}
      <Sheet
        open={showAssignSheet}
        onClose={() => setShowAssignSheet(false)}
        title="Vincular línea"
        subtitle={`Líneas sin cliente asignado · ${unlinkedLines.length} disponible${unlinkedLines.length !== 1 ? 's' : ''}`}
      >
        <div className="p-6 space-y-5">
          {/* Filtros */}
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { v: '', l: 'Todas' },
                { v: 'clicktv', l: 'ClickTV' },
                { v: 'raptor', l: 'Raptor' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setAssignPlatform(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                    assignPlatform === v
                      ? 'bg-clicktv-500 text-white border-clicktv-500'
                      : 'bg-bg text-fg-muted border-border hover:border-clicktv-500/40',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: '', l: 'Todos estados' },
                { v: 'active', l: 'Activas' },
                { v: 'expiring', l: 'Por vencer' },
                { v: 'expired', l: 'Vencidas' },
                { v: 'blocked', l: 'Bloqueadas' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setAssignStatus(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                    assignStatus === v
                      ? 'bg-fg text-bg border-fg'
                      : 'bg-bg text-fg-muted border-border hover:border-fg/20',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
            <Input
              placeholder="Buscar username…"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista */}
          {unlinkedLoading ? (
            <LoadingState label="Buscando líneas…" />
          ) : unlinkedLines.length === 0 ? (
            <EmptyState
              icon={<Link2Off className="h-8 w-8" />}
              title="Sin líneas disponibles"
              description="No hay líneas sin vincular con estos filtros."
            />
          ) : (
            <div className="space-y-2">
              {unlinkedLines.map((line: any) => (
                <div key={line.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg hover:bg-bg-muted transition-colors">
                  <PlatformBadge platform={line.platform} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{line.username}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={line.status} />
                      <span className="text-xs text-fg-subtle">{expiryLabel(line.expires_at)}</span>
                      <span className="text-xs text-fg-subtle">{line.screens} pant.</span>
                    </div>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => handleLink(line.id)} loading={linkLine.isPending}>
                    Vincular
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>

      {/* Dialog: Crear línea */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Crear nueva línea"
        className="max-w-lg"
      >
        <form onSubmit={handleCreateLine} className="space-y-4 mt-4">
          {/* Platform selector */}
          <div>
            <label className="label">Plataforma</label>
            <div className="grid grid-cols-2 gap-3">
              {(['clicktv', 'raptor'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setCreatePlatform(p); setCreateIsDemo(false); }}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    createPlatform === p
                      ? 'border-clicktv-500 bg-clicktv-500/10 text-clicktv-500'
                      : 'border-border hover:bg-bg text-fg-muted'
                  }`}
                >
                  {p === 'clicktv' ? 'ClickTV' : 'Raptor TV'}
                </button>
              ))}
            </div>
          </div>

          {/* Name hint */}
          <div>
            <label className="label">Nombre (para generar usuario)</label>
            <Input
              value={createNameHint}
              onChange={(e) => setCreateNameHint(e.target.value)}
              placeholder="Juan"
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username</label>
              <Input
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <Input
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="font-mono text-xs"
                disabled={createPlatform === 'raptor'}
              />
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={regenerateCreateCredentials}>
            Regenerar
          </Button>

          {/* Package / Duration */}
          {createPlatform === 'clicktv' ? (
            <>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="demo"
                  checked={createIsDemo}
                  onChange={(e) => {
                    setCreateIsDemo(e.target.checked);
                    if (e.target.checked) setCreatePackageId(7);
                    else setCreatePackageId(5);
                  }}
                  className="rounded border-border accent-clicktv-500"
                />
                <label htmlFor="demo" className="text-sm text-fg-muted">Es demo</label>
              </div>
              <div>
                <label className="label">Paquete</label>
                <Select value={createPackageId} onChange={(e) => setCreatePackageId(Number(e.target.value))}>
                  {CLICKTV_PACKAGES.filter((p) => (createIsDemo ? p.is_trial : !p.is_trial)).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {!p.is_trial ? `(${p.credits} cred.)` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Duración</label>
              <Select value={createRaptorMonths} onChange={(e) => setCreateRaptorMonths(Number(e.target.value))}>
                {RAPTOR_DURATIONS.map((d) => (
                  <option key={d.months} value={d.months}>{d.label}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={createLine.isPending}>Crear y vincular</Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog: action */}
      <Dialog
        open={dialog.type === 'action'}
        onClose={() => setDialog({ type: null })}
        title={dialog.action === 'renew' ? 'Renovar línea' : 'Renovar + cambiar contraseña'}
      >
        <div className="space-y-4 mt-4">
          {dialog.platform === 'clicktv' ? (
            <div>
              <label className="label">Paquete</label>
              <Select value={selectedPkg} onChange={(e) => setSelectedPkg(Number(e.target.value))}>
                {CLICKTV_PACKAGES.filter((p) => !p.is_trial).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.credits} crédito{p.credits > 1 ? 's' : ''})</option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="label">Meses</label>
              <Select value={selectedMonths} onChange={(e) => setSelectedMonths(Number(e.target.value))}>
                <option value={1}>1 mes</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" loading={lineAction.isPending}
              onClick={() => dialog.lineId && dialog.platform && dialog.action && executeAction(dialog.lineId, dialog.platform, dialog.action)}>
              Confirmar
            </Button>
            <Button variant="ghost" onClick={() => setDialog({ type: null })}>Cancelar</Button>
          </div>
        </div>
      </Dialog>

      {/* Sheet: editar línea */}
      <EditLineSheet line={editLine} onClose={() => setEditLine(null)} />

      {/* Dialog: message */}
      <Dialog
        open={dialog.type === 'message'}
        onClose={() => { setDialog({ type: null }); setRenderedMsg(null); }}
        title="Mensaje para el cliente"
      >
        <div className="space-y-4 mt-4">
          {!renderedMsg && (
            <>
              <div>
                <label className="label">Plantilla</label>
                <Select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setRenderedMsg(null); }}>
                  {templates.filter((t) => !dialog.platform || t.platform === dialog.platform).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
              {renderTpl.isPending ? (
                <div className="text-sm text-fg-muted animate-pulse py-1">Generando mensaje…</div>
              ) : (
                <Button variant="secondary" size="sm" onClick={generateMessage}>
                  Generar preview
                </Button>
              )}
            </>
          )}
          {renderedMsg && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/8 border border-success/20 text-success text-xs font-semibold">
                <CheckCheck className="h-4 w-4 shrink-0" />
                Mensaje copiado al portapapeles
              </div>
              <div className="bg-bg rounded-xl p-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-border">
                {renderedMsg.text}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => copyToClipboard(renderedMsg.text)}>
                  <Copy className="h-3.5 w-3.5" /> Copiar de nuevo
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openWhatsApp(renderedMsg.waUrl)}>
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
