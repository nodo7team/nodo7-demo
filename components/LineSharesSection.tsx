'use client';

import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLineShares, useAddLineShare, useRemoveLineShare, useClients } from '@/lib/hooks';

interface LineSharesSectionProps {
  lineId: string;
  totalScreens: number;
  prefilledClientId?: string;
  prefilledClientName?: string;
  isPrimary?: boolean;
  defaultOpen?: boolean;
  onSheetClose?: () => void;
}

export function LineSharesSection({
  lineId,
  totalScreens,
  prefilledClientId,
  prefilledClientName,
  isPrimary,
  defaultOpen,
  onSheetClose,
}: LineSharesSectionProps) {
  const { data, isLoading } = useLineShares(lineId);
  const addShare = useAddLineShare(lineId);
  const removeShare = useRemoveLineShare(lineId);

  const [sheetOpen, setSheetOpen] = useState(defaultOpen ?? false);
  const [clientSearch, setClientSearch] = useState(prefilledClientName ?? '');
  const [selectedClientId, setSelectedClientId] = useState(prefilledClientId ?? '');
  const [selectedClientName, setSelectedClientName] = useState(prefilledClientName ?? '');
  const [screens, setScreens] = useState<number | ''>(1);
  const [notes, setNotes] = useState('');

  const { data: clientsData } = useClients(clientSearch.length >= 2 ? clientSearch : undefined);
  const clientOptions = clientsData?.clients || [];

  const shares = data?.shares || [];
  const usedScreens = shares.reduce((s, sh) => s + sh.screens, 0);
  const freeScreens = totalScreens - usedScreens;

  const resetForm = () => {
    setClientSearch(prefilledClientName ?? '');
    setSelectedClientId(prefilledClientId ?? '');
    setSelectedClientName(prefilledClientName ?? '');
    setScreens(1);
    setNotes('');
  };

  const handleClose = () => {
    setSheetOpen(false);
    resetForm();
    onSheetClose?.();
  };

  const handleAdd = () => {
    if (!selectedClientId) return;
    addShare.mutate(
      { client_id: selectedClientId, screens: screens || 1, notes: notes || undefined },
      { onSuccess: resetForm },
    );
  };

  if (isLoading) return null;

  const hasShares = shares.length > 0;
  const summaryText = !hasShares
    ? (isPrimary && prefilledClientName
        ? `${prefilledClientName.split(' ')[0]} · todas las ${totalScreens} pant.`
        : 'Sin asignaciones')
    : null;

  return (
    <>
      {/* Resumen compacto */}
      <div className="pt-3 border-t border-border flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-fg-subtle flex-1 min-w-0">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {summaryText ? (
            <span>{summaryText}</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {shares.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-clicktv-500/10 text-clicktv-500 font-semibold text-[10px]"
                >
                  {s.clients?.name?.split(' ')[0] || 'Cliente'} · {s.screens}p
                </span>
              ))}
              <span className={cn(
                'text-[10px] font-medium',
                usedScreens > totalScreens ? 'text-danger' : usedScreens === totalScreens ? 'text-warning' : 'text-fg-subtle',
              )}>
                ({usedScreens}/{totalScreens})
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-clicktv-500 hover:opacity-75 transition-opacity"
        >
          <Users className="h-3 w-3" />
          {!hasShares && isPrimary ? 'Dividir' : 'Gestionar'}
        </button>
      </div>

      {/* Sheet de gestión */}
      <Sheet
        open={sheetOpen}
        onClose={handleClose}
        title="Asignación de pantallas"
        subtitle={`${usedScreens} de ${totalScreens} pantallas asignadas`}
      >
        <div className="p-6 space-y-6">
          {/* Asignaciones existentes */}
          {hasShares && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide">Asignaciones actuales</p>
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-3 p-4 rounded-xl bg-bg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-fg">{share.clients?.name || 'Sin nombre'}</div>
                    {share.clients?.phone && <div className="text-xs text-fg-subtle">{share.clients.phone}</div>}
                    {share.notes && <div className="text-xs text-fg-muted italic mt-0.5">{share.notes}</div>}
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-clicktv-500/10 text-clicktv-500 font-bold text-sm shrink-0">
                    {share.screens} pant.
                  </span>
                  <button
                    onClick={() => removeShare.mutate(share.id)}
                    disabled={removeShare.isPending}
                    className="p-2 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de nueva asignación */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide">
              {hasShares ? 'Agregar asignación' : 'Asignar pantallas'}
            </p>

            <div>
              <label className="label">Cliente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
                <Input
                  placeholder="Buscar por nombre o teléfono…"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClientId('');
                    setSelectedClientName('');
                  }}
                  className="pl-10"
                />
              </div>
              {clientSearch.length >= 2 && clientOptions.length > 0 && !selectedClientId && (
                <div className="mt-1 bg-bg-elevated border border-border rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-border">
                  {clientOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-bg-muted transition-colors"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setSelectedClientName(c.name || 'Sin nombre');
                        setClientSearch(c.name || '');
                      }}
                    >
                      <div className="font-semibold text-sm text-fg">{c.name || 'Sin nombre'}</div>
                      {c.phone && <div className="text-xs text-fg-subtle">{c.phone}</div>}
                    </button>
                  ))}
                </div>
              )}
              {selectedClientId && (
                <div className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clicktv-500/10 border border-clicktv-500/20">
                  <span className="flex-1 text-sm font-semibold text-clicktv-500">{selectedClientName}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedClientId(''); setSelectedClientName(''); setClientSearch(''); }}
                  >
                    <X className="h-4 w-4 text-clicktv-500" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pantallas</label>
                <input
                  type="number"
                  min={1}
                  max={totalScreens}
                  value={screens}
                  onChange={(e) => {
                    const v = e.target.value;
                    setScreens(v === '' ? '' : Math.max(1, Number(v)));
                  }}
                  onBlur={() => setScreens((s) => s === '' ? 1 : s)}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
              <div>
                <label className="label">Nota (opcional)</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: familiar, oficina…" />
              </div>
            </div>

            {freeScreens < (screens || 1) && freeScreens >= 0 && (
              <div className="text-xs text-danger font-medium px-3 py-2 rounded-lg bg-danger/10">
                Superás las pantallas disponibles ({freeScreens} libre{freeScreens !== 1 ? 's' : ''})
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleAdd} loading={addShare.isPending} disabled={!selectedClientId}>
                Asignar pantallas
              </Button>
              <Button variant="ghost" onClick={resetForm}>Limpiar</Button>
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
