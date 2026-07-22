'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PlatformBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatExpiry } from '@/lib/utils/dates';
import type { LineStatus, Platform, Client, ClientWithLines } from '@/types';
import {
  Search, Link2, Plus, SkipForward, ChevronRight, ChevronLeft,
  CheckCircle, Users, UserX, Loader2, X, Copy, Check, SlidersHorizontal,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

// ── Types ──
interface UnlinkedLine {
  id: string;
  platform: Platform;
  username: string;
  password: string | null;
  screens: number;
  package_label: string | null;
  expires_at: string | null;
  status: LineStatus;
}

type PlatformFilter = 'all' | 'clicktv' | 'raptor';
type StatusFilter = 'all' | 'active' | 'expiring' | 'expired';
type SortBy = 'expiry_asc' | 'expiry_desc' | 'username';

// ── Status dot colors ──
const STATUS_DOT: Record<LineStatus, string> = {
  active: 'bg-success',
  expiring: 'bg-warning',
  expired: 'bg-danger',
  blocked: 'bg-fg-subtle',
  demo: 'bg-accent',
};

// ── API helpers ──
async function fetchAllUnlinked(): Promise<UnlinkedLine[]> {
  const res = await fetch('/api/lines?unlinked=true&exclude_shared=true&limit=500');
  if (!res.ok) throw new Error('Error al cargar líneas');
  const data = await res.json();
  return data.lines || [];
}

async function searchClients(term: string): Promise<ClientWithLines[]> {
  if (term.length < 2) return [];
  const res = await fetch(`/api/clients?search=${encodeURIComponent(term)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.clients || [];
}

async function linkLineToClient(clientId: string, lineId: string) {
  const res = await fetch(`/api/clients/${clientId}/link-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_id: lineId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error al vincular');
  return data;
}

async function createClient(name: string, phone: string): Promise<Client> {
  const body: Record<string, string> = {};
  if (name.trim()) body.name = name.trim();
  if (phone.trim()) body.phone = phone.trim();
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error al crear cliente');
  return data.client;
}

// ── Filter controls ──
function FilterControls({
  platformFilter, setPlatformFilter,
  statusFilter, setStatusFilter,
  sortBy, setSortBy,
  totalAll, totalFiltered,
  onReset,
}: {
  platformFilter: PlatformFilter;
  setPlatformFilter: (v: PlatformFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  totalAll: number;
  totalFiltered: number;
  onReset: () => void;
}) {
  const activeFilters = (platformFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="p-3 border-b border-border space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Filtros</span>
        {activeFilters > 0 && (
          <button onClick={onReset} className="text-[10px] font-semibold text-accent hover:underline">
            Limpiar ({activeFilters})
          </button>
        )}
      </div>

      {/* Plataforma */}
      <div className="flex gap-1">
        {(['all', 'clicktv', 'raptor'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={cn(
              'flex-1 text-[10px] font-bold py-1 rounded-lg transition-all',
              platformFilter === p
                ? 'bg-accent text-white shadow-sm'
                : 'bg-bg text-fg-muted hover:text-fg border border-border',
            )}
          >
            {p === 'all' ? 'Todas' : p === 'clicktv' ? 'ClickTV' : 'Raptor'}
          </button>
        ))}
      </div>

      {/* Estado */}
      <div className="flex gap-1">
        {([
          { value: 'all', label: 'Todas' },
          { value: 'active', label: 'Activas' },
          { value: 'expiring', label: 'Venciendo' },
          { value: 'expired', label: 'Vencidas' },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'flex-1 text-[10px] font-bold py-1 rounded-lg transition-all',
              statusFilter === value
                ? 'bg-accent text-white shadow-sm'
                : 'bg-bg text-fg-muted hover:text-fg border border-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orden */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortBy)}
        className="w-full text-[11px] bg-bg border border-border rounded-lg px-2 py-1.5 text-fg focus:outline-none focus:ring-1 focus:ring-accent/30"
      >
        <option value="expiry_asc">Vence primero</option>
        <option value="expiry_desc">Vence último</option>
        <option value="username">Username A-Z</option>
      </select>

      {/* Resultado del filtro */}
      {activeFilters > 0 && (
        <div className="text-[10px] text-fg-subtle text-center">
          {totalFiltered} de {totalAll} líneas visibles
        </div>
      )}
    </div>
  );
}

// ── Done Screen ──
function DoneScreen({ linked, skipped, total }: { linked: number; skipped: number; total: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-8">
      <div className="h-20 w-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-success" />
      </div>
      <div>
        <h2 className="text-2xl font-bold font-display">¡Todo procesado!</h2>
        <p className="text-fg-muted mt-2">Revisaste todas las líneas sin cliente</p>
      </div>
      <div className="flex gap-4">
        <div className="bg-success/5 border border-success/20 rounded-2xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-success">{linked}</div>
          <div className="text-xs font-semibold text-success/80 mt-1">Vinculadas</div>
        </div>
        <div className="bg-warning/5 border border-warning/20 rounded-2xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-warning">{skipped}</div>
          <div className="text-xs font-semibold text-warning/80 mt-1">Saltadas</div>
        </div>
        <div className="bg-bg-elevated border border-border rounded-2xl px-6 py-4 text-center">
          <div className="text-3xl font-bold text-fg">{total}</div>
          <div className="text-xs font-semibold text-fg-muted mt-1">Total</div>
        </div>
      </div>
      <Button variant="primary" size="md" asChild>
        <Link href="/clients">Ir a Clientes</Link>
      </Button>
    </div>
  );
}

// ── Main Page ──
export default function LinkPendingPage() {
  // ── Data ──
  const [lines, setLines] = useState<UnlinkedLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(true);

  // ── Queue state ──
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [linkedCount, setLinkedCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── Filters ──
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('expiry_asc');
  const [showFilters, setShowFilters] = useState(false);

  // ── Client search ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ClientWithLines[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithLines | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Create form ──
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // ── Action ──
  const [linking, setLinking] = useState(false);
  const [usernameCopied, setUsernameCopied] = useState(false);

  // Load lines on mount
  useEffect(() => {
    fetchAllUnlinked()
      .then(setLines)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingLines(false));
  }, []);

  // Pending lines with filters + sort applied
  const allPending = useMemo(() => lines.filter((l) => !doneIds.has(l.id)), [lines, doneIds]);

  const pendingLines = useMemo(() => {
    let result = allPending;
    if (platformFilter !== 'all') result = result.filter((l) => l.platform === platformFilter);
    if (statusFilter !== 'all') result = result.filter((l) => l.status === statusFilter);
    return [...result].sort((a, b) => {
      if (sortBy === 'username') return a.username.localeCompare(b.username);
      const ta = a.expires_at ? new Date(a.expires_at).getTime() : (sortBy === 'expiry_asc' ? Infinity : -Infinity);
      const tb = b.expires_at ? new Date(b.expires_at).getTime() : (sortBy === 'expiry_asc' ? Infinity : -Infinity);
      return sortBy === 'expiry_asc' ? ta - tb : tb - ta;
    });
  }, [allPending, platformFilter, statusFilter, sortBy]);

  const currentLine = pendingLines[currentIndex] ?? null;
  const isDone = !loadingLines && allPending.length === 0;

  // Reset index when filters change
  useEffect(() => { setCurrentIndex(0); }, [platformFilter, statusFilter, sortBy]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch client search results
  useEffect(() => {
    if (debouncedSearch.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchClients(debouncedSearch)
      .then(setSearchResults)
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  // Reset work area when current line changes
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setSearchResults([]);
    setSelectedClient(null);
    setShowCreate(false);
    setNewName('');
    setNewPhone('');
    setUsernameCopied(false);
  }, [currentLine?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && !isInput) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLine]);

  const markDone = useCallback((id: string) => {
    setDoneIds((prev) => new Set([...prev, id]));
    setCurrentIndex(0);
  }, []);

  const handleSkip = useCallback(() => {
    if (!currentLine) return;
    setSkippedIds((prev) => new Set([...prev, currentLine.id]));
    markDone(currentLine.id);
  }, [currentLine, markDone]);

  const handleLink = useCallback(async (client: ClientWithLines) => {
    if (!currentLine || linking) return;
    setLinking(true);
    try {
      await linkLineToClient(client.id, currentLine.id);
      setLinkedCount((c) => c + 1);
      markDone(currentLine.id);
      toast.success(`✓ ${currentLine.username} → ${client.name || client.phone || 'Cliente'}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLinking(false);
    }
  }, [currentLine, linking, markDone]);

  const handleCreateAndLink = useCallback(async () => {
    if (!currentLine || linking) return;
    if (!newName.trim() && !newPhone.trim()) {
      toast.error('Ingresá al menos nombre o teléfono');
      return;
    }
    setLinking(true);
    try {
      const client = await createClient(newName, newPhone);
      await linkLineToClient(client.id, currentLine.id);
      setLinkedCount((c) => c + 1);
      markDone(currentLine.id);
      toast.success(`✓ Cliente creado y vinculado a ${currentLine.username}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLinking(false);
    }
  }, [currentLine, linking, newName, newPhone, markDone]);

  const copyUsername = useCallback(() => {
    if (!currentLine) return;
    navigator.clipboard.writeText(currentLine.username).then(() => {
      setUsernameCopied(true);
      setTimeout(() => setUsernameCopied(false), 1500);
      toast.success('Usuario copiado');
    });
  }, [currentLine]);

  const resetFilters = useCallback(() => {
    setPlatformFilter('all');
    setStatusFilter('all');
    setSortBy('expiry_asc');
  }, []);

  const progress = lines.length > 0 ? (linkedCount / lines.length) * 100 : 0;
  const activeFilterCount = (platformFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  if (loadingLines) {
    return (
      <>
        <Topbar title="Vincular pendientes" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-fg-subtle" />
        </div>
      </>
    );
  }

  if (isDone) {
    return (
      <>
        <Topbar title="Vincular pendientes" subtitle="Completado" />
        <DoneScreen linked={linkedCount} skipped={skippedIds.size} total={lines.length} />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Vincular pendientes"
        subtitle={`${pendingLines.length} líneas${activeFilterCount > 0 ? ` (filtradas de ${allPending.length})` : ' sin cliente'}`}
      />

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>

        {/* ── Panel izquierdo: cola ── (oculto en móvil) */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-border flex-col bg-bg-elevated overflow-hidden">

          {/* Stats y progreso */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-success">{linkedCount} vinc.</span>
              <span className="text-warning">{skippedIds.size} salt.</span>
              <span className="text-fg-muted">{allPending.length} pend.</span>
            </div>
            <div className="w-full bg-bg rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-success to-success/80 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-center text-fg-subtle">
              {Math.round(progress)}% completado
            </div>
          </div>

          {/* Filtros */}
          <FilterControls
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            totalAll={allPending.length}
            totalFiltered={pendingLines.length}
            onReset={resetFilters}
          />

          {/* Lista de pendientes */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {pendingLines.length === 0 ? (
              <div className="text-center text-xs text-fg-subtle py-8">
                Sin resultados con estos filtros
              </div>
            ) : (
              pendingLines.map((line, i) => (
                <button
                  key={line.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all border',
                    i === currentIndex
                      ? 'bg-accent/10 border-accent/20 text-accent'
                      : 'hover:bg-bg-muted border-transparent text-fg-muted hover:text-fg',
                  )}
                >
                  <div className="font-bold text-sm truncate">{line.username}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[line.status])} />
                    <PlatformBadge platform={line.platform} />
                    <span className="text-xs opacity-60">{formatExpiry(line.expires_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Panel derecho: área de trabajo ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">

          {/* Progreso + filtros (solo móvil) */}
          <div className="md:hidden mb-4 space-y-3">
            <div className="bg-bg-elevated rounded-2xl border border-border p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-success">{linkedCount} vinc.</span>
                <span className="text-warning">{skippedIds.size} salt.</span>
                <span className="text-fg-muted">{allPending.length} pend.</span>
              </div>
              <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-success to-success/80 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-center text-fg-subtle">{Math.round(progress)}% completado</div>
            </div>

            {/* Botón para mostrar/ocultar filtros en móvil */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="w-full flex items-center justify-between bg-bg-elevated border border-border rounded-2xl px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-fg-muted" />
                <span className="text-sm font-semibold text-fg">Filtros y orden</span>
                {activeFilterCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <ChevronRight className={cn('h-4 w-4 text-fg-muted transition-transform', showFilters && 'rotate-90')} />
            </button>

            {showFilters && (
              <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden">
                <FilterControls
                  platformFilter={platformFilter}
                  setPlatformFilter={setPlatformFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  totalAll={allPending.length}
                  totalFiltered={pendingLines.length}
                  onReset={resetFilters}
                />
              </div>
            )}
          </div>

          {currentLine ? (
            <div className="max-w-xl mx-auto space-y-5">

              {/* Card de la línea */}
              <div className="bg-bg-elevated rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[currentLine.status])} />
                      <div className="text-2xl md:text-4xl font-bold font-display truncate leading-tight">
                        {currentLine.username}
                      </div>
                      <button
                        onClick={copyUsername}
                        title="Copiar usuario"
                        className={cn(
                          'shrink-0 p-1.5 rounded-lg transition-all',
                          usernameCopied
                            ? 'bg-success/10 text-success'
                            : 'text-fg-subtle hover:text-fg hover:bg-bg-muted',
                        )}
                      >
                        {usernameCopied
                          ? <Check className="h-4 w-4" />
                          : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-sm text-fg-muted mt-2 flex flex-wrap gap-2">
                      <span>{currentLine.package_label || 'Sin paquete'}</span>
                      <span>·</span>
                      <span>{currentLine.screens} pantalla{currentLine.screens !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className={cn(
                        currentLine.status === 'expired' ? 'text-danger font-semibold' :
                        currentLine.status === 'expiring' ? 'text-warning font-semibold' : '',
                      )}>
                        Vence: {formatExpiry(currentLine.expires_at)}
                      </span>
                    </div>
                  </div>
                  <PlatformBadge platform={currentLine.platform} />
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-fg-subtle">
                    {currentIndex + 1} de {pendingLines.length} en cola
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-muted disabled:opacity-30 transition-colors"
                      title="Anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex((i) => Math.min(pendingLines.length - 1, i + 1))}
                      disabled={currentIndex >= pendingLines.length - 1}
                      className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-muted disabled:opacity-30 transition-colors"
                      title="Siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Buscador de cliente */}
              <div className="bg-bg-elevated rounded-2xl border border-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-fg-muted" />
                  <h3 className="font-bold text-sm text-fg">Buscar cliente existente</h3>
                  <span className="ml-auto hidden md:inline text-xs text-fg-subtle bg-bg px-2 py-0.5 rounded-lg border border-border">
                    / para enfocar
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
                    placeholder="Nombre o teléfono…"
                    className="w-full pl-10 pr-10 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-fg-subtle" />
                  )}
                  {search && !searching && (
                    <button
                      onClick={() => { setSearch(''); setSearchResults([]); setSelectedClient(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-bg-muted text-fg-subtle"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && !selectedClient && (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-muted border border-border transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {c.name || <span className="text-fg-subtle italic">Sin nombre</span>}
                          </div>
                          <div className="text-xs text-fg-muted">{c.phone || '—'}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-fg-subtle group-hover:text-fg transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {debouncedSearch.length >= 2 && searchResults.length === 0 && !searching && (
                  <div className="text-sm text-fg-subtle text-center py-3">
                    Sin resultados — podés crear el cliente abajo
                  </div>
                )}

                {selectedClient && (
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-center justify-between animate-fade-in">
                    <div className="min-w-0">
                      <div className="font-bold text-sm">
                        {selectedClient.name || <span className="text-fg-subtle italic">Sin nombre</span>}
                      </div>
                      <div className="text-xs text-fg-muted">{selectedClient.phone || 'Sin teléfono'}</div>
                      {selectedClient.active_lines > 0 && (
                        <div className="text-xs text-fg-subtle mt-0.5">
                          {selectedClient.active_lines} línea{selectedClient.active_lines !== 1 ? 's' : ''} activa{selectedClient.active_lines !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedClient(null)}
                        className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={linking}
                        onClick={() => handleLink(selectedClient)}
                        className="gap-1.5"
                      >
                        <Link2 className="h-4 w-4" />
                        Vincular
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Crear nuevo cliente */}
              <div className="bg-bg-elevated rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setShowCreate((v) => !v)}
                  className="w-full flex items-center gap-2.5 px-5 py-4 hover:bg-bg-muted transition-colors text-left"
                >
                  <div className={cn(
                    'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                    showCreate ? 'bg-accent/10 text-accent' : 'bg-bg border border-border text-fg-muted',
                  )}>
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm text-fg">Crear nuevo cliente</span>
                  <ChevronRight className={cn(
                    'h-4 w-4 text-fg-subtle ml-auto transition-transform duration-200',
                    showCreate && 'rotate-90',
                  )} />
                </button>

                {showCreate && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4 animate-fade-in">
                    <Input
                      placeholder="Nombre (opcional)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                      placeholder="Teléfono (ej: 5491112345678)"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      type="tel"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      loading={linking}
                      onClick={handleCreateAndLink}
                    >
                      <Plus className="h-4 w-4" />
                      Crear y vincular
                    </Button>
                  </div>
                )}
              </div>

              {/* Saltar */}
              <div className="flex justify-between items-center pt-1">
                <span className="hidden md:inline text-xs text-fg-subtle">Esc para saltar</span>
                <span className="md:hidden" />
                <Button variant="secondary" size="sm" onClick={handleSkip} disabled={linking}>
                  <SkipForward className="h-4 w-4" />
                  Saltar esta línea
                </Button>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-fg-subtle">
                <UserX className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {activeFilterCount > 0
                    ? 'No hay líneas con estos filtros'
                    : 'Seleccioná una línea de la lista'}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="mt-2 text-xs text-accent hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
