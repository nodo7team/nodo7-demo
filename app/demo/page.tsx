'use client';

import { useState, useId } from 'react';
import { Tv2, Play, Clock, Zap, CheckCircle, AlertCircle, Copy, ExternalLink, ChevronRight, Shield, Info } from 'lucide-react';

// ── Número de WhatsApp del dueño (configurable por env var) ──────────────────
// Formato: solo dígitos con código de país, ej: 5491112345678
const OWNER_WHATSAPP = process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function whatsappUrl(text: string): string {
  const encoded = encodeURIComponent(text);
  if (OWNER_WHATSAPP) return `https://wa.me/${OWNER_WHATSAPP}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
type DemoPackage = { id: 6 | 7; label: string; duration: string; icon: React.ReactNode; description: string };
type FormState = 'idle' | 'loading' | 'success' | 'error';

interface DemoResult {
  username: string;
  password: string;
  expires_at: string | null;
  package_name: string;
}

// ── Configuración de paquetes demo ───────────────────────────────────────────
const DEMO_PACKAGES: DemoPackage[] = [
  {
    id: 7,
    label: '1 hora FULL',
    duration: '1 hora',
    icon: <Zap className="h-5 w-5" />,
    description: 'Acceso completo a todos los canales y contenidos.',
  },
  {
    id: 6,
    label: '4 horas',
    duration: '4 horas',
    icon: <Clock className="h-5 w-5" />,
    description: 'Sin acceso a eventos en vivo, ideal para series y películas.',
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function DemoPage() {
  const formId = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [packageId, setPackageId] = useState<6 | 7>(7);
  const [state, setState] = useState<FormState>('idle');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState<'user' | 'pass' | null>(null);

  const handleCopy = (type: 'user' | 'pass', text: string) => {
    copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), package_id: packageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error ?? 'Ocurrió un error. Intentá de nuevo.');
        setState('error');
        return;
      }

      setResult(data);
      setState('success');
    } catch {
      setErrorMsg('No se pudo conectar. Verificá tu conexión e intentá de nuevo.');
      setState('error');
    }
  };

  const whatsappMessage = result
    ? `Hola! Acabo de generar mi demo de ClickTV y te la envio para confirmarla:\n\n*Usuario:* ${result.username}\n*Contrasena:* ${result.password}\n*Duracion:* ${result.package_name}\n\nGracias!`
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-bg relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full bg-clicktv-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-clicktv-500 to-clicktv-600 flex items-center justify-center mb-4 shadow-xl shadow-clicktv-500/25">
            <Tv2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">Probá ClickTV gratis</h1>
          <p className="text-sm text-fg-muted mt-1 text-center">
            Generá tu cuenta de prueba en segundos, sin tarjeta ni compromiso.
          </p>
        </div>

        {/* ── Estado: Formulario ── */}
        {(state === 'idle' || state === 'loading' || state === 'error') && (
          <div className="bg-bg-elevated rounded-3xl shadow-card border border-border p-6 sm:p-8 space-y-6">

            {/* Aviso de uso justo — siempre visible */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/6 border border-accent/15">
              <Shield className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div className="text-xs text-fg-muted leading-relaxed space-y-1">
                <p className="font-bold text-fg">Este servicio es de uso personal y único.</p>
                <p>
                  La demo es para que <span className="font-semibold">vos</span> podás probar el servicio antes de contratar.
                  Cada persona puede generar <span className="font-semibold">una sola demo</span>, y quedamos con registro de cada solicitud.
                  Si detectamos un uso indebido, la cuenta queda bloqueada de inmediato.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {state === 'error' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-danger/8 border border-danger/20 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-snug">{errorMsg}</p>
              </div>
            )}

            <form id={formId} onSubmit={handleSubmit} className="space-y-5">

              {/* Nombre */}
              <div className="space-y-1.5">
                <label htmlFor="demo-name" className="text-xs font-bold text-fg-muted uppercase tracking-wide">
                  Tu nombre
                </label>
                <input
                  id="demo-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan García"
                  required
                  minLength={2}
                  maxLength={80}
                  disabled={state === 'loading'}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors disabled:opacity-50"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label htmlFor="demo-phone" className="text-xs font-bold text-fg-muted uppercase tracking-wide">
                  Tu número de WhatsApp
                </label>
                <input
                  id="demo-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  required
                  disabled={state === 'loading'}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors disabled:opacity-50"
                />
                <div className="flex items-start gap-2 mt-1">
                  <Info className="h-3.5 w-3.5 text-fg-subtle shrink-0 mt-0.5" />
                  <p className="text-[11px] text-fg-subtle leading-snug">
                    <span className="font-semibold">Una demo por número</span>, sin excepciones.
                    Registramos cada solicitud. Intentar con números falsos o de terceros viola los términos del servicio.
                  </p>
                </div>
              </div>

              {/* Tipo de demo */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-fg-muted uppercase tracking-wide">
                  Tipo de demo
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {DEMO_PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      disabled={state === 'loading'}
                      onClick={() => setPackageId(pkg.id)}
                      className={[
                        'flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        packageId === pkg.id
                          ? 'border-accent bg-accent/8 shadow-sm shadow-accent/10'
                          : 'border-border bg-bg hover:border-accent/40 hover:bg-accent/4',
                      ].join(' ')}
                    >
                      <span className={packageId === pkg.id ? 'text-accent' : 'text-fg-muted'}>
                        {pkg.icon}
                      </span>
                      <div>
                        <div className={`text-sm font-bold ${packageId === pkg.id ? 'text-accent' : 'text-fg'}`}>
                          {pkg.label}
                        </div>
                        <div className="text-[11px] text-fg-subtle leading-snug mt-0.5">
                          {pkg.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={state === 'loading' || !name.trim() || !phone.trim()}
                className={[
                  'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl',
                  'text-sm font-bold text-white transition-all duration-200',
                  'bg-gradient-to-r from-clicktv-500 to-clicktv-600',
                  'hover:from-clicktv-600 hover:to-clicktv-700 shadow-lg shadow-clicktv-500/25',
                  'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
                  'active:scale-[0.98]',
                ].join(' ')}
              >
                {state === 'loading' ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando tu demo…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generar mi demo gratis
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </>
                )}
              </button>
            </form>

          </div>
        )}

        {/* ── Estado: Éxito ── */}
        {state === 'success' && result && (
          <div className="bg-bg-elevated rounded-3xl shadow-card border border-border overflow-hidden">

            {/* Header de éxito */}
            <div className="px-6 py-5 bg-gradient-to-r from-clicktv-500/10 to-accent/5 border-b border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/15 border border-success/20 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="font-bold text-fg">¡Tu demo está lista!</div>
                <div className="text-xs text-fg-muted mt-0.5">{result.package_name}</div>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* Credenciales */}
              <div className="space-y-3">
                {/* Usuario */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-wide mb-0.5">Usuario</div>
                    <div className="font-mono font-bold text-fg text-lg tracking-wide truncate">{result.username}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('user', result.username)}
                    title="Copiar usuario"
                    className="shrink-0 p-2.5 rounded-xl bg-bg-muted hover:bg-accent/10 hover:text-accent text-fg-muted transition-all active:scale-95"
                  >
                    {copied === 'user'
                      ? <CheckCircle className="h-4 w-4 text-success" />
                      : <Copy className="h-4 w-4" />
                    }
                  </button>
                </div>

                {/* Contraseña */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-wide mb-0.5">Contraseña</div>
                    <div className="font-mono font-bold text-fg text-lg tracking-wide">{result.password}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('pass', result.password)}
                    title="Copiar contraseña"
                    className="shrink-0 p-2.5 rounded-xl bg-bg-muted hover:bg-accent/10 hover:text-accent text-fg-muted transition-all active:scale-95"
                  >
                    {copied === 'pass'
                      ? <CheckCircle className="h-4 w-4 text-success" />
                      : <Copy className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning/6 border border-warning/15">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-fg-muted leading-relaxed">
                  <span className="font-bold text-warning">⚠️ Importante:</span> para que tu demo quede activa,
                  tenés que enviarnos estos datos por WhatsApp. Si no confirmás en las próximas horas,
                  la cuenta se desactiva automáticamente.
                </p>
              </div>

              {/* Botón WhatsApp */}
              <a
                href={whatsappUrl(whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm transition-all shadow-lg shadow-[#25D366]/25 active:scale-[0.98]"
              >
                {/* WhatsApp SVG icon */}
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Confirmá tu demo por WhatsApp
                <ExternalLink className="h-4 w-4 ml-auto shrink-0" />
              </a>

              <p className="text-center text-[11px] text-fg-subtle leading-relaxed">
                📲 Tocá el botón para enviarnos tus credenciales y confirmar la demo.<br />
                <span className="font-semibold text-warning/80">Sin confirmación, la cuenta se desactiva.</span>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-fg-subtle mt-6 opacity-60">
          © ClickTV · Servicio de streaming
        </p>
      </div>
    </div>
  );
}
