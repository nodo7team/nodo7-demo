'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClientWithLines, Line, MessageTemplate, LineShare, DemoRequest } from '@/types';
import { toast } from 'sonner';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return res.json();
}

// ── Clientes ──
export function useClients(search?: string, expiring?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (expiring) params.set('expiring', expiring);
  const qs = params.toString();
  return useQuery<{ clients: ClientWithLines[] }>({
    queryKey: ['clients', qs],
    queryFn: () => fetcher(`/api/clients?${qs}`),
  });
}

export function useClient(id: string) {
  return useQuery<{ client: any; lines: Line[]; logs: any[]; shared_lines: any[] }>({
    queryKey: ['client', id],
    queryFn: () => fetcher(`/api/clients/${id}`),
    enabled: !!id,
  });
}

// ── Líneas ──
export function useLines(filters?: { platform?: string; status?: string; search?: string; page?: number; unlinked?: boolean; excludeShared?: boolean; sort?: string }) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.unlinked) params.set('unlinked', 'true');
  if (filters?.excludeShared) params.set('exclude_shared', 'true');
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.page && filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return useQuery<{
    lines: (Line & { clients?: { id: string; name: string; phone: string } | null })[];
    total: number;
    page: number;
    pages: number;
  }>({
    queryKey: ['lines', qs],
    queryFn: () => fetcher(`/api/lines?${qs}`),
  });
}

// ── Stats ──
export function useStats() {
  return useQuery<{
    lines: {
      total: number; active: number; expiring: number; expired: number;
      blocked: number; demo: number; clicktv: number; raptor: number;
      unlinked: number; expiring_today: number;
    };
    next7days: { day: number; count: number }[];
    clients: { total: number };
    config: { clicktv_credits: number | null; last_full_sync_at: string | null };
  }>({
    queryKey: ['stats'],
    queryFn: () => fetcher('/api/stats'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ── Demos ──
export function useDemos(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return useQuery<{ demos: DemoRequest[]; stats: { total: number; ok: number; blocked: number; error: number } }>({
    queryKey: ['demos', filters],
    queryFn: () => fetcher(`/api/demos${qs ? `?${qs}` : ''}`),
  });
}

// ── Templates ──
export function useTemplates() {
  return useQuery<{ templates: MessageTemplate[] }>({
    queryKey: ['templates'],
    queryFn: () => fetcher('/api/templates'),
  });
}

// ── Acciones sobre líneas ──
export function useLineAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: {
      platform: 'clicktv' | 'raptor';
      lineId: string;
      method: 'PATCH' | 'DELETE';
      body?: any;
    }) => {
      const res = await fetch(`/api/${opts.platform}/lines/${opts.lineId}`, {
        method: opts.method,
        headers: { 'Content-Type': 'application/json' },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

// ── Crear línea ──
export function useCreateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { platform: 'clicktv' | 'raptor'; body: any }) => {
      const res = await fetch(`/api/${opts.platform}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Línea creada');
    },
    onError: (e: any) => {
      toast.error('Error al crear línea: ' + e.message);
    },
  });
}

// ── Clientes CRUD ──
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; phone?: string; notes?: string }) => {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; phone?: string; notes?: string }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
      toast.success('Cliente actualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Template CRUD ──
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { key: string; name: string; body: string; platform?: 'clicktv' | 'raptor' | null }) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Plantilla creada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Plantilla eliminada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; body?: string }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Plantilla guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Vincular / Desvincular línea a cliente ──
export function useLinkLine(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lineId: string) => {
      const res = await fetch(`/api/clients/${clientId}/link-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_id: lineId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', clientId] });
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Línea vinculada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUnlinkLine(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lineId: string) => {
      const res = await fetch(`/api/clients/${clientId}/unlink-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_id: lineId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', clientId] });
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Línea desvinculada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Búsqueda global (clientes + líneas) ──
export function useGlobalSearch(search: string) {
  const trimmed = search.trim().toLowerCase();
  const enabled = trimmed.length >= 2;

  const clientsQuery = useQuery<{ clients: ClientWithLines[] }>({
    queryKey: ['clients', 'search', trimmed],
    queryFn: () => fetcher(`/api/clients?search=${encodeURIComponent(trimmed)}`),
    enabled,
  });

  const linesQuery = useQuery<{
    lines: (Line & { clients?: { id: string; name: string; phone: string } | null })[];
    total: number; page: number; pages: number;
  }>({
    queryKey: ['lines', 'search', trimmed],
    queryFn: () => fetcher(`/api/lines?search=${encodeURIComponent(trimmed)}`),
    enabled,
  });

  // Líneas que matchean por username pero NO tienen cliente vinculado,
  // O tienen cliente pero ese cliente NO apareció en la búsqueda de clientes
  const foundClientIds = new Set((clientsQuery.data?.clients ?? []).map((c) => c.id));
  const lineResults = (linesQuery.data?.lines ?? [])
    .filter((l) => {
      // Si no tiene cliente vinculado, mostrar la línea directamente
      if (!l.clients?.id) return true;
      // Si tiene cliente pero ese cliente NO apareció en la búsqueda de clientes,
      // mostrar la línea (porque el match fue por username)
      return !foundClientIds.has(l.clients.id);
    })
    .map((l) => ({ type: 'line' as const, data: l }));

  return {
    results: [
      ...(clientsQuery.data?.clients ?? []).map((c) => ({ type: 'client' as const, data: c })),
      ...lineResults,
    ],
    isLoading: clientsQuery.isLoading || linesQuery.isLoading,
  };
}

// ── Editar campos locales de una línea ──
export function useUpdateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lineId,
      ...fields
    }: {
      lineId: string;
      username?: string;
      password?: string | null;
      screens?: number;
      package_id?: number | null;
      package_label?: string | null;
      expires_at?: string | null;
      status?: 'active' | 'expiring' | 'expired' | 'blocked' | 'demo';
    }) => {
      const res = await fetch(`/api/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al actualizar');
      return data as UpdateLineResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// El tipo de retorno incluye info de sync
export type UpdateLineResult = { line: Line; syncedFields: string[]; syncWarnings: string[] };

// ── Asignar / desasignar cliente a una línea ──
export function useAssignLineClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, clientId }: { lineId: string; clientId: string | null }) => {
      const res = await fetch(`/api/lines/${lineId}/client`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: (_, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['lines'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
      toast.success(clientId ? 'Cliente asignado' : 'Cliente desvinculado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Eliminar share desde el perfil del cliente (sin lineId pre-fijado) ──
export function useDeleteLineShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, shareId }: { lineId: string; shareId: string }) => {
      const res = await fetch(`/api/lines/${lineId}/shares/${shareId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client'] });
      qc.invalidateQueries({ queryKey: ['line-shares'] });
      toast.success('Asignación eliminada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Pantallas compartidas (line_shares) ──
export function useLineShares(lineId: string) {
  return useQuery<{ shares: LineShare[] }>({
    queryKey: ['line-shares', lineId],
    queryFn: () => fetcher(`/api/lines/${lineId}/shares`),
    enabled: !!lineId,
  });
}

export function useAddLineShare(lineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { client_id: string; screens: number; notes?: string }) => {
      const res = await fetch(`/api/lines/${lineId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data as { share: LineShare };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-shares', lineId] });
      qc.invalidateQueries({ queryKey: ['client'] });
      toast.success('Pantallas asignadas');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveLineShare(lineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/lines/${lineId}/shares/${shareId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['line-shares', lineId] });
      qc.invalidateQueries({ queryKey: ['client'] });
      toast.success('Asignación eliminada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Render template ──
export function useRenderTemplate() {
  return useMutation({
    mutationFn: async (opts: { templateId: string; lineId?: string; variables?: Record<string, string> }) => {
      const res = await fetch(`/api/templates/${opts.templateId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_id: opts.lineId, variables: opts.variables }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data as { rendered: string; whatsapp_url: string; phone: string | null };
    },
  });
}

// ── Sales and Sheets Sync Hooks ──
export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await fetch('/api/sales');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error cargando ventas');
      return data as {
        success: boolean;
        kpis: {
          totalIncome: number;
          totalExpense: number;
          netBalance: number;
          transactionCount: number;
        };
        chartDataByDay: Array<{ date: string; total: number }>;
        chartDataByMonth: Array<{ month: string; total: number }>;
        appDistribution: Array<{ name: string; value: number }>;
        transactions: Array<{
          id: string;
          sale_date: string;
          raw_notification: string;
          app: string;
          amount: string;
          client_name: string;
          transaction_type: 'income' | 'expense';
          google_sheet_row_id: string;
          platform: string;
        }>;
      };
    },
  });
}

export function useSyncSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sync/sheets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error sincronizando planillas');
      return data as { success: boolean; total_rows: number; processed: number; message: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      toast.success(data.message || 'Sincronización de ventas completada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── App Config ──
export interface AppConfig {
  id: number;
  pin_hash: string | null;
  last_full_sync_at: string | null;
  clicktv_credits: number | null;
  raptor_credits: number | null;
  auto_send_on_renew: boolean;
  auto_copy_on_renew: boolean;
  updated_at: string;
}

export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: () => fetcher('/api/config'),
    staleTime: 30_000,
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Pick<AppConfig, 'auto_send_on_renew' | 'auto_copy_on_renew'>>) => {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      return data as AppConfig;
    },
    onSuccess: (data) => {
      qc.setQueryData(['app-config'], data);
    },
    onError: (e: any) => toast.error('Error al guardar ajuste: ' + e.message),
  });
}

