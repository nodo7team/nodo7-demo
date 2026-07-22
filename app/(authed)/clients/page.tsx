'use client';

import { Topbar } from '@/components/layout/Topbar';
import { useClients } from '@/lib/hooks';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PlatformBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { expiryLabel } from '@/lib/utils/dates';
import { Users, Plus, Search, Phone, Link2, Download } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function exportClientsToCsv(clients: any[]): string {
  const headers = ['Nombre', 'Teléfono', 'Líneas activas', 'Próx. vencimiento', 'Notas'];
  const rows = clients.map((c) => [
    c.name || '',
    c.phone || '',
    c.active_lines ?? 0,
    c.next_expiry ? String(c.next_expiry).slice(0, 10) : '',
    (c.notes || '').replace(/\n/g, ' '),
  ]);
  return [headers, ...rows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, error } = useClients(search || undefined, expiryFilter || undefined);
  const clients = data?.clients || [];

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Error al exportar');
      const { clients: all } = await res.json();
      downloadCsv(exportClientsToCsv(all), `clientes-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Topbar title="Clientes" subtitle={`${clients.length} clientes registrados`} />
      <div className="px-5 md:px-8 py-6 max-w-7xl space-y-5">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
            <Input
              placeholder="Buscar por nombre o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)} className="w-full sm:w-48">
            <option value="">Todos los estados</option>
            <option value="1">Vencen hoy</option>
            <option value="3">Próximos 3 días</option>
            <option value="7">Próximos 7 días</option>
            <option value="expired">Vencidos</option>
          </Select>
          <Button variant="ghost" size="md" className="w-full sm:w-auto" onClick={handleExportCsv} loading={exporting}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Button variant="secondary" size="md" className="w-full sm:w-auto" asChild>
            <Link href="/clients/link-pending">
              <Link2 className="h-4 w-4" /> Vincular pendientes
            </Link>
          </Button>
          <Button variant="primary" size="md" className="w-full sm:w-auto" asChild>
            <Link href="/clients/new"><Plus className="h-4 w-4" /> Nuevo</Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-danger" />}
            title="Error al cargar"
            description={error.message || 'No se pudieron cargar los clientes'}
          />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Sin clientes"
            description={search ? 'No hay resultados para tu búsqueda' : 'Creá tu primer cliente'}
            action={
              !search ? (
                <Button variant="primary" size="sm" asChild><Link href="/clients/new"><Plus className="h-4 w-4" /> Nuevo cliente</Link></Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((c: any) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="bg-bg-elevated rounded-2xl shadow-card p-5 transition-all hover:shadow-card-hover hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-fg truncate">{c.name || 'Sin nombre'}</div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-fg-subtle">
                      <Phone className="h-3 w-3" />
                      {c.phone || '—'}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-fg-subtle bg-bg rounded-lg px-2 py-1 border border-border">
                    {c.active_lines || 0} línea{c.active_lines !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {c.lines?.map((l: any) => (
                    <PlatformBadge key={l.id} platform={l.platform} />
                  ))}
                  {(!c.lines || c.lines.length === 0) && (
                    <span className="text-xs text-fg-subtle italic">Sin líneas</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-fg-subtle">Próx. vencimiento</span>
                  <span className="text-xs font-semibold">{expiryLabel(c.next_expiry)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
