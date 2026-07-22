'use client';

import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PlatformBadge } from '@/components/ui/Badge';
import { CLICKTV_PACKAGES } from '@/types';
import { AlertTriangle, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUpdateLine } from '@/lib/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface EditLineSheetProps {
  line: any | null;
  onClose: () => void;
}

/** ISO → "YYYY-MM-DD" para input[type=date] */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** "YYYY-MM-DD" → ISO timestamp */
function fromDateInput(d: string): string | null {
  if (!d) return null;
  return `${d}T00:00:00.000Z`;
}

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Activa' },
  { value: 'expiring', label: 'Por vencer' },
  { value: 'expired',  label: 'Vencida' },
  { value: 'blocked',  label: 'Bloqueada' },
  { value: 'demo',     label: 'Demo' },
];

/** Badge que indica si un campo se sincroniza a la plataforma */
function SyncBadge({ syncs, label }: { syncs: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1.5',
        syncs
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-fg-muted/10 text-fg-muted border border-fg-muted/20',
      )}
    >
      {syncs ? <RefreshCw className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
      {syncs ? `Sincroniza con ${label}` : 'Solo local'}
    </span>
  );
}

export function EditLineSheet({ line, onClose }: EditLineSheetProps) {
  const updateLine = useUpdateLine();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [screens,      setScreens]      = useState(1);
  const [packageId,    setPackageId]    = useState<number | null>(null);
  const [packageLabel, setPackageLabel] = useState('');
  const [expiresAt,    setExpiresAt]    = useState('');
  const [status,       setStatus]       = useState('active');

  // Populate cuando cambia la línea
  useEffect(() => {
    if (!line) return;
    setUsername(line.username     ?? '');
    setPassword(line.password     ?? '');
    setScreens(line.screens       ?? 1);
    setPackageId(line.package_id  ?? null);
    setPackageLabel(line.package_label ?? '');
    setExpiresAt(toDateInput(line.expires_at));
    setStatus(line.status         ?? 'active');
  }, [line?.id]);

  const isClickTV = line?.platform === 'clicktv';
  const isRaptor  = line?.platform === 'raptor';
  const platformLabel = isClickTV ? 'ClickTV' : 'Raptor';

  const handleClickTVPackage = (pkgId: number) => {
    setPackageId(pkgId);
    const pkg = CLICKTV_PACKAGES.find((p) => p.id === pkgId);
    if (pkg) {
      setPackageLabel(pkg.name);
      setScreens(pkg.screens);
    }
  };

  const handleSave = () => {
    if (!line) return;
    if (!username.trim()) { toast.error('El usuario no puede estar vacío'); return; }

    updateLine.mutate(
      {
        lineId:        line.id,
        username:      username.trim(),
        password:      password.trim() || null,
        screens,
        package_id:    packageId,
        package_label: packageLabel.trim() || null,
        expires_at:    fromDateInput(expiresAt),
        status:        status as any,
      },
      {
        onSuccess: (res: any) => {
          const synced: string[] = res?.syncedFields ?? [];
          const warnings: string[] = res?.syncWarnings ?? [];

          if (synced.length > 0) {
            toast.success(`Guardado y sincronizado: ${synced.join(', ')}`);
          } else {
            toast.success('Guardado localmente');
          }
          if (warnings.length > 0) {
            warnings.forEach((w) => toast.warning(w));
          }

          onClose();
        },
      },
    );
  };

  return (
    <Sheet
      open={!!line}
      onClose={onClose}
      title="Editar línea"
      subtitle={line ? line.username : ''}
    >
      {line && (
        <div className="p-6 space-y-6 overflow-y-auto">

          {/* Banner informativo de sync */}
          <div className="rounded-xl border border-border bg-bg-muted p-3.5 space-y-2 text-xs">
            <div className="font-bold text-fg flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-success" />
              Qué se sincroniza con {platformLabel}
            </div>
            <ul className="space-y-1 text-fg-muted">
              {isClickTV && (
                <>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    <span>Usuario y contraseña → sincroniza vía <code className="text-[10px]">edit_line</code></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    <span>Estado bloquear/desbloquear → sincroniza</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-fg-subtle shrink-0" />
                    <span>Paquete, pantallas y fecha → solo local (usá Renovar para renovar)</span>
                  </li>
                </>
              )}
              {isRaptor && (
                <>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    <span>Contraseña → sincroniza vía <code className="text-[10px]">edituser.php</code></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    <span>Estado bloquear/desbloquear → sincroniza</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-fg-subtle shrink-0" />
                    <span>Usuario (email), fecha y plan → solo local</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Info de la línea */}
          <div className="flex items-center gap-2">
            <PlatformBadge platform={line.platform} />
            {line.external_id && (
              <span className="text-[11px] font-mono text-fg-muted bg-bg rounded-md px-2 py-0.5 border border-border">
                ID: {line.external_id}
              </span>
            )}
          </div>

          {/* ── Credenciales ────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
              Credenciales
            </p>
            <div>
              <label className="label">
                Usuario
                <SyncBadge syncs={isClickTV} label="ClickTV" />
                {isRaptor && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 bg-fg-muted/10 text-fg-muted border border-fg-muted/20">
                    <Lock className="h-2.5 w-2.5" />
                    Solo local (es el email en Raptor)
                  </span>
                )}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre_usuario"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isRaptor}
                title={isRaptor ? 'El usuario de Raptor es el email y no puede cambiarse' : undefined}
              />
              {isRaptor && (
                <p className="text-[10px] text-fg-muted mt-1">
                  En Raptor el usuario es el email y funciona como identificador único. No se puede cambiar.
                </p>
              )}
            </div>
            <div>
              <label className="label">
                Contraseña
                <SyncBadge syncs={true} label={platformLabel} />
              </label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="contraseña"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </section>

          {/* ── Plan ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
              Plan
              <span className="ml-2 font-medium normal-case tracking-normal text-fg-muted">
                (solo local — para renovar usá el botón Renovar)
              </span>
            </p>

            {isClickTV && (
              <div>
                <label className="label">
                  Paquete ClickTV
                  <SyncBadge syncs={false} label="" />
                </label>
                <Select
                  value={packageId ?? ''}
                  onChange={(e) => handleClickTVPackage(Number(e.target.value))}
                >
                  <option value="">— Sin paquete —</option>
                  {CLICKTV_PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <p className="text-[10px] text-fg-muted mt-1">
                  Cambia pantallas y etiqueta localmente. Para renovar de verdad usá el botón Renovar.
                </p>
              </div>
            )}

            <div>
              <label className="label">
                Etiqueta del plan
                <SyncBadge syncs={false} label="" />
              </label>
              <Input
                value={packageLabel}
                onChange={(e) => setPackageLabel(e.target.value)}
                placeholder="Ej: 1 Mes - 2 Pantallas"
              />
            </div>

            <div>
              <label className="label">
                Pantallas
                <SyncBadge syncs={false} label="" />
              </label>
              <Select
                value={screens}
                onChange={(e) => setScreens(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} pantalla{n > 1 ? 's' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="label">
                Fecha de vencimiento
                <SyncBadge syncs={false} label="" />
              </label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </section>

          {/* ── Estado ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
              Estado
            </p>
            <div>
              <label className="label">
                Estado
                <SyncBadge syncs={true} label={`${platformLabel} (bloquear/desbloquear)`} />
              </label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
              <p className="text-[10px] text-fg-muted mt-1">
                Cambiar a/de "Bloqueada" se sincroniza. Los demás estados son locales.
              </p>
            </div>
          </section>

          {/* ── Acciones ────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-bg-panel pb-2">
            <Button
              variant="primary"
              loading={updateLine.isPending}
              onClick={handleSave}
              className="flex-1"
            >
              Guardar y sincronizar
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={updateLine.isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
