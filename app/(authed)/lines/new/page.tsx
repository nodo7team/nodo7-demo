'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PlatformBadge } from '@/components/ui/Badge';
import { useCreateLine, useTemplates, useClients } from '@/lib/hooks';
import { CLICKTV_PACKAGES, RAPTOR_DURATIONS } from '@/types';
import { generateUsername, generatePassword, generateRaptorEmail } from '@/lib/utils/generators';
import { formatExpiry, formatExpiryTemplate } from '@/lib/utils/dates';
import { selectBestTemplate, renderTemplate, whatsappUrl } from '@/lib/utils/templates';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Copy, MessageSquare, CheckCheck, Plus } from 'lucide-react';
import Link from 'next/link';

// ── Result screen ──
function ResultScreen({
  result,
  platform,
  onCreateAnother,
}: {
  result: any;
  platform: 'clicktv' | 'raptor';
  onCreateAnother: () => void;
}) {
  const router = useRouter();
  const { data: templatesData } = useTemplates();
  const templates = templatesData?.templates || [];
  const [selectedId, setSelectedId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!templates.length || selectedId) return;
    const id = selectBestTemplate(templates, platform, 'new');
    if (id) setSelectedId(id);
  }, [templates, platform, selectedId]);

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const vars: Record<string, string> = {
    username: result.username || '',
    password: result.password || '',
    screens: String(result.line?.screens ?? result.package?.screens ?? 1),
    expiry_date: formatExpiryTemplate(result.expires_at),
    package: result.package?.name || result.line?.package_label || '',
    name: '',
  };

  const message = selectedTemplate ? renderTemplate(selectedTemplate.body, vars) : '';
  const waUrl = whatsappUrl(null, message);

  const copyText = (text: string) =>
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado'));

  const copyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      toast.success('Mensaje copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const credentials = [
    { label: 'Usuario', value: result.username },
    { label: 'Contraseña', value: result.password },
    { label: 'Vencimiento', value: result.expires_at ? formatExpiry(result.expires_at) : '—' },
    ...(result.package ? [{ label: 'Paquete', value: result.package.name }] : []),
    ...(result.line?.screens ? [{ label: 'Pantallas', value: String(result.line.screens) }] : []),
  ];

  return (
    <>
      <Topbar title="Línea creada" subtitle="Credenciales listas para entregar" />

      <div className="px-5 md:px-8 py-6 max-w-4xl space-y-5">
        {/* Credentials */}
        <div className="bg-bg-elevated rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            <span className="font-bold text-success-subtle text-sm">Línea creada exitosamente</span>
            <PlatformBadge platform={platform} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {credentials.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => copyText(String(value))}
                className="text-left bg-bg hover:bg-bg-muted rounded-xl p-3 border border-border hover:border-clicktv-300 transition-all group"
              >
                <div className="text-[10px] font-semibold text-fg-subtle mb-1 flex items-center justify-between uppercase tracking-wide">
                  {label}
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
                <div className="text-sm font-bold break-all">{value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="bg-bg-elevated rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <MessageSquare className="h-4 w-4 text-fg-subtle" />
              <h2 className="font-bold text-fg">Mensaje para el cliente</h2>
            </div>
            <Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="sm:w-60"
            >
              {templates.length === 0 && (
                <option value="">Cargando plantillas…</option>
              )}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          {selectedTemplate ? (
            <>
              <div className="bg-bg rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-border">
                {message}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={copyMessage}>
                  {copied ? (
                    <><CheckCheck className="h-4 w-4" /> Copiado</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copiar mensaje</>
                  )}
                </Button>
                <Button variant="secondary" asChild>
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4" /> Abrir WhatsApp
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-fg-muted py-4 text-center">
              {templates.length === 0 ? 'Cargando plantillas…' : 'Seleccioná una plantilla'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onCreateAnother}><Plus className="h-4 w-4" /> Crear otra línea</Button>
          <Button variant="ghost" onClick={() => router.push('/lines')}>Ir a líneas</Button>
          <Button variant="ghost" asChild>
            <Link href="/clients/new">Nuevo cliente</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Creation form ──
export default function NewLinePage() {
  const create = useCreateLine();
  const router = useRouter();
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients || [];

  const [platform, setPlatform] = useState<'clicktv' | 'raptor'>('clicktv');
  const [nameHint, setNameHint] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [packageId, setPackageId] = useState(5);
  const [raptorMonths, setRaptorMonths] = useState(1);
  const [isDemo, setIsDemo] = useState(false);
  const [clientId, setClientId] = useState('');

  const [result, setResult] = useState<any>(null);
  const manualUsername = useRef(false);

  // Cambio de plataforma: regenerar todo y resetear flag
  useEffect(() => {
    manualUsername.current = false;
    if (platform === 'clicktv') {
      setUsername(generateUsername(nameHint || 'cliente'));
      setPassword(generatePassword(8));
    } else {
      setUsername(generateRaptorEmail(nameHint || 'cliente'));
      setPassword('123456');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  // Nombre del cliente: actualizar username en tiempo real (debounce 280ms)
  useEffect(() => {
    if (manualUsername.current) return;
    const t = setTimeout(() => {
      setUsername(
        platform === 'clicktv'
          ? generateUsername(nameHint || 'cliente')
          : generateRaptorEmail(nameHint || 'cliente'),
      );
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameHint]);

  const regenerate = () => {
    manualUsername.current = false;
    if (platform === 'clicktv') {
      setUsername(generateUsername(nameHint || 'cliente'));
      setPassword(generatePassword(8));
    } else {
      setUsername(generateRaptorEmail(nameHint || 'cliente'));
      setPassword('123456');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (platform === 'clicktv') {
      create.mutate(
        { platform, body: { package_id: packageId, username, password, is_trial: isDemo, name_hint: nameHint, client_id: clientId || undefined } },
        { onSuccess: (data: any) => setResult(data) },
      );
    } else {
      create.mutate(
        { platform, body: { name: nameHint || 'Cliente', email: username, password, months: raptorMonths, client_id: clientId || undefined } },
        { onSuccess: (data: any) => setResult(data) },
      );
    }
  };

  const handleCreateAnother = () => {
    setResult(null);
    regenerate();
  };

  if (result) {
    return (
      <ResultScreen
        result={result}
        platform={platform}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return (
    <>
      <Topbar title="Nueva línea" />
      <div className="px-5 md:px-8 py-6 max-w-lg">
        <div className="bg-bg-elevated rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-clicktv-500/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-clicktv-500" />
            </div>
            <span className="font-bold text-fg">Nueva línea</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Platform selector */}
            <div>
              <label className="label">Plataforma</label>
              <div className="grid grid-cols-2 gap-3">
                {(['clicktv', 'raptor'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPlatform(p); setIsDemo(false); }}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                      platform === p
                        ? 'border-clicktv-500 bg-clicktv-500/10 text-clicktv-500 shadow-sm'
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
              <label className="label">Nombre del cliente</label>
              <Input
                value={nameHint}
                onChange={(e) => setNameHint(e.target.value)}
                placeholder="Juan"
              />
            </div>

            {/* Generated credentials */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username</label>
                <Input
                  value={username}
                  onChange={(e) => { manualUsername.current = true; setUsername(e.target.value); }}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono text-xs"
                  disabled={platform === 'raptor'}
                />
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={regenerate}>
              Regenerar credenciales
            </Button>

            {/* Package / Duration */}
            {platform === 'clicktv' ? (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="demo"
                    checked={isDemo}
                    onChange={(e) => {
                      setIsDemo(e.target.checked);
                      if (e.target.checked) setPackageId(7);
                      else setPackageId(5);
                    }}
                    className="rounded border-border accent-clicktv-500"
                  />
                  <label htmlFor="demo" className="text-sm text-fg-muted">Es demo</label>
                </div>
                <div>
                  <label className="label">Paquete</label>
                  <Select value={packageId} onChange={(e) => setPackageId(Number(e.target.value))}>
                    {CLICKTV_PACKAGES.filter((p) => (isDemo ? p.is_trial : !p.is_trial)).map((p) => (
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
                <Select value={raptorMonths} onChange={(e) => setRaptorMonths(Number(e.target.value))}>
                  {RAPTOR_DURATIONS.map((d) => (
                    <option key={d.months} value={d.months}>{d.label}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Cliente */}
            <div>
              <label className="label">Cliente (opcional)</label>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Sin asignar</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.phone || c.id}</option>
                ))}
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={create.isPending}>Crear línea</Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/lines')}>Cancelar</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
