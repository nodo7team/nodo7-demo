'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppConfig, useUpdateConfig } from '@/lib/hooks';
import {
  Shield, RefreshCw, Server, LogOut,
  MessageSquare, Copy, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ── Info row (solo lectura) ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-fg-subtle font-medium">{label}</span>
      <span className="text-sm font-bold text-fg">{value ?? '—'}</span>
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  saving,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-fg">{label}</div>
        <div className="text-xs text-fg-muted mt-0.5 leading-relaxed">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !saving && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          checked ? 'bg-accent' : 'bg-bg-muted border border-border',
          saving && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  iconClass,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl shadow-card p-6">
      <h2 className="text-sm font-bold text-fg mb-4 flex items-center gap-2">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconClass || 'bg-bg-muted')}>
          {icon}
        </div>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: config, refetch } = useAppConfig();
  const updateConfig = useUpdateConfig();
  const [syncing, setSyncing] = useState(false);

  const handleToggle = (key: 'auto_send_on_renew' | 'auto_copy_on_renew', val: boolean) => {
    updateConfig.mutate(
      { [key]: val },
      {
        onSuccess: () => toast.success('Ajuste guardado'),
      },
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      const duration = data?.duration_ms ?? '?';
      const ct = data?.clicktv?.upserted ?? 0;
      const rp = data?.raptor?.upserted ?? 0;
      toast.success(`Sincronizado en ${duration}ms — ClickTV: ${ct}, Raptor: ${rp}`);
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // Defaults seguros mientras carga (tratamos null/undefined como true)
  const autoSend = config?.auto_send_on_renew !== false;
  const autoCopy = config?.auto_copy_on_renew !== false;
  const saving = updateConfig.isPending;

  return (
    <>
      <Topbar title="Ajustes" subtitle="Configuración del sistema" />

      <div className="px-5 md:px-8 py-6 max-w-2xl space-y-5 animate-fade-in">

        {/* ── Estado del sistema ── */}
        <Section
          icon={<Server className="h-4 w-4 text-clicktv-500" />}
          iconClass="bg-clicktv-500/10"
          title="Estado del sistema"
        >
          <div className="space-y-1">
            <InfoRow label="Créditos ClickTV" value={config?.clicktv_credits} />
            <InfoRow label="Créditos Raptor" value={config?.raptor_credits ?? 'N/A'} />
            <InfoRow
              label="Último sync"
              value={
                config?.last_full_sync_at
                  ? new Date(config.last_full_sync_at).toLocaleString('es-AR', { hour12: false })
                  : 'Nunca'
              }
            />
          </div>
        </Section>

        {/* ── Mensajería ── */}
        <Section
          icon={<MessageSquare className="h-4 w-4 text-accent" />}
          iconClass="bg-accent/10"
          title="Mensajería al renovar"
        >
          <p className="text-xs text-fg-muted mb-1 -mt-2">
            Controlá qué pasa automáticamente cada vez que renovás una línea.
          </p>

          <ToggleRow
            label="Abrir WhatsApp automáticamente"
            description="Al renovar, abre el chat de WhatsApp del cliente con el mensaje listo para enviar."
            checked={autoSend}
            onChange={(val) => handleToggle('auto_send_on_renew', val)}
            saving={saving}
          />

          <ToggleRow
            label="Copiar mensaje al portapapeles"
            description="Al renovar, copia el mensaje de renovación para que lo puedas pegar en cualquier app."
            checked={autoCopy}
            onChange={(val) => handleToggle('auto_copy_on_renew', val)}
            saving={saving}
          />

          {/* Estado actual */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full',
              autoSend ? 'bg-success/10 text-success' : 'bg-bg-muted text-fg-muted border border-border',
            )}>
              <CheckCircle className="h-3 w-3" />
              WhatsApp: {autoSend ? 'auto' : 'manual'}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full',
              autoCopy ? 'bg-success/10 text-success' : 'bg-bg-muted text-fg-muted border border-border',
            )}>
              <Copy className="h-3 w-3" />
              Portapapeles: {autoCopy ? 'auto' : 'manual'}
            </span>
          </div>
        </Section>

        {/* ── Sincronización ── */}
        <Section
          icon={<RefreshCw className="h-4 w-4 text-raptor-500" />}
          iconClass="bg-raptor-500/10"
          title="Sincronización"
        >
          <p className="text-sm text-fg-muted mb-4">
            Fuerza una sincronización completa de ambas plataformas. Se ejecuta automáticamente cada 24 horas.
          </p>
          <Button variant="primary" onClick={handleSync} loading={syncing}>
            <RefreshCw className="h-4 w-4" />
            Sincronizar ahora
          </Button>
        </Section>

        {/* ── Seguridad ── */}
        <Section
          icon={<Shield className="h-4 w-4 text-fg-muted" />}
          title="Seguridad"
        >
          <p className="text-sm text-fg-muted mb-4">
            Para cambiar el PIN, regenerá el hash con el script{' '}
            <code className="text-xs font-mono bg-bg px-2 py-1 rounded-lg border border-border">
              npx tsx scripts/set-pin.ts NUEVO_PIN
            </code>
            {' '}y actualizá la variable{' '}
            <code className="text-xs font-mono bg-bg px-2 py-1 rounded-lg border border-border">
              APP_PIN_HASH
            </code>
            {' '}en Vercel.
          </p>
          <Button variant="danger" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </Section>

      </div>
    </>
  );
}
