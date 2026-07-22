'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlatformBadge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/States';
import { useTemplates, useUpdateTemplate, useCreateTemplate, useDeleteTemplate } from '@/lib/hooks';
import { useRef, useState } from 'react';
import { Save, Edit2, MessageSquare, RefreshCw, Key, CheckCheck, X, Plus, Trash2 } from 'lucide-react';
import { renderTemplate } from '@/lib/utils/templates';
import type { MessageTemplate } from '@/types';

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  renew:          RefreshCw,
  renew_pass:     Key,
  reset_password: Key,
};

const SAMPLE_VARS: Record<string, string> = {
  username:    'juantv877',
  password:    'kx5nw3mp',
  screens:     '3',
  expiry_date: '15/06/2026',
  name:        'Juan',
  package:     '1 Mes · 3 Pantallas',
};

const ALL_VARS = Object.keys(SAMPLE_VARS);

function HighlightedBody({ body }: { body: string }) {
  const parts = body.split(/(\{[^}]+\})/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg">
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-mono text-[11px] font-bold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function WhatsAppBubble({ text }: { text: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: '#111b21' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#202c33' }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: '#00a884' }}>C</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white/90 leading-tight">Cliente</div>
          <div className="text-[10px] text-white/40 leading-tight">WhatsApp</div>
        </div>
      </div>
      <div className="px-4 py-5 flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm px-4 py-3 shadow-lg" style={{ background: '#005c4b' }}>
          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{text || '…'}</p>
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-white/50">ahora</span>
            <CheckCheck className="h-3.5 w-3.5" style={{ color: '#53bdeb' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Formulario de nueva plantilla ──
function NewTemplateForm({ onClose }: { onClose: () => void }) {
  const create = useCreateTemplate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [body, setBody] = useState('');
  const [platform, setPlatform] = useState<'clicktv' | 'raptor' | ''>('');

  const rendered = renderTemplate(body, SAMPLE_VARS);

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{${v}}`;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { key, name, body, platform: platform || null },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-card overflow-hidden border-2 border-accent/20">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border bg-accent/5">
        <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Plus className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm text-fg">Nueva plantilla</div>
          <div className="text-xs text-fg-subtle mt-0.5">Completá los campos y guardá</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Renovación ClickTV" required />
          </div>
          <div>
            <label className="label">Clave interna (key)</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="clicktv_renew_2"
              className="font-mono text-xs"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Plataforma</label>
          <div className="flex gap-2">
            {(['', 'clicktv', 'raptor'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  platform === p
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg text-fg-muted border-border hover:border-accent/40'
                }`}
              >
                {p === '' ? 'Ambas' : p === 'clicktv' ? 'ClickTV' : 'Raptor'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <label className="label">Contenido</label>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hola {name}, tu línea {username} fue renovada…"
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm font-mono min-h-[180px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              required
            />
            <div className="space-y-1.5">
              <p className="text-xs text-fg-subtle">Insertar variable:</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_VARS.map((v) => (
                  <button key={v} type="button" onClick={() => insertVar(v)}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-mono font-bold hover:bg-accent/20 active:scale-95 transition-all">
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="label">Preview en vivo</label>
            <WhatsAppBubble text={rendered} />
          </div>
        </div>

        <div className="flex gap-2 pt-1 border-t border-border">
          <Button type="submit" variant="primary" loading={create.isPending}>
            <Plus className="h-3.5 w-3.5" /> Crear plantilla
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ── Card de plantilla existente ──
function TemplateCard({ template }: { template: MessageTemplate }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(template.body);
  const [name, setName] = useState(template.name);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const update = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const Icon = TEMPLATE_ICONS[template.key] || MessageSquare;
  const rendered = renderTemplate(body, SAMPLE_VARS);
  const detectedVars = [...new Set((body.match(/\{(\w+)\}/g) || []).map((m) => m.slice(1, -1)))];

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{${v}}`;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; });
  };

  const handleSave = () => {
    update.mutate({ id: template.id, body, name }, { onSuccess: () => setEditing(false) });
  };

  const handleCancel = () => {
    setBody(template.body);
    setName(template.name);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirm(`¿Eliminar la plantilla "${template.name}"? No se puede deshacer.`)) return;
    deleteTemplate.mutate(template.id);
  };

  return (
    <div className="bg-bg-elevated rounded-2xl shadow-card overflow-hidden transition-all hover:shadow-card-hover">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
        <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm font-bold h-8 py-1" />
          ) : (
            <div className="font-bold text-sm text-fg">{template.name}</div>
          )}
          {template.platform
            ? <div className="mt-1"><PlatformBadge platform={template.platform} /></div>
            : <div className="text-xs text-fg-subtle mt-0.5">Todas las plataformas</div>
          }
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleteTemplate.isPending}
                className="p-2 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger transition-colors"
                title="Eliminar plantilla"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {editing && (
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide">Contenido</p>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm font-mono min-h-[220px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />
              <div className="space-y-1.5">
                <p className="text-xs text-fg-subtle">Tocá para insertar en el cursor:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_VARS.map((v) => (
                    <button key={v} type="button" onClick={() => insertVar(v)}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-mono font-bold hover:bg-accent/20 active:scale-95 transition-all">
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs text-fg-subtle tabular-nums">{body.length} caracteres</div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide">Preview en vivo</p>
              <WhatsAppBubble text={rendered} />
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {detectedVars.map((v) => (
                  <span key={v} className="text-xs font-mono">
                    <span className="text-accent">{`{${v}}`}</span>
                    <span className="text-fg-subtle/60"> → {SAMPLE_VARS[v] ?? '…'}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1 border-t border-border">
            <Button variant="primary" size="sm" onClick={handleSave} loading={update.isPending}>
              <Save className="h-3.5 w-3.5" /> Guardar cambios
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide mb-2">Contenido</p>
            <div className="bg-bg rounded-xl p-4 border border-border">
              <HighlightedBody body={body} />
            </div>
            {detectedVars.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                {detectedVars.map((v) => (
                  <span key={v} className="text-xs font-mono">
                    <span className="text-accent">{`{${v}}`}</span>
                    <span className="text-fg-subtle/60"> → {SAMPLE_VARS[v] ?? 'valor real'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wide mb-2">Así llega al cliente</p>
            <WhatsAppBubble text={rendered} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página ──
export default function TemplatesPage() {
  const { data, isLoading } = useTemplates();
  const templates = data?.templates || [];
  const [showNew, setShowNew] = useState(false);

  return (
    <>
      <Topbar title="Plantillas" subtitle="Mensajes personalizables para WhatsApp" />
      <div className="px-5 md:px-8 py-6 max-w-3xl space-y-5">
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setShowNew((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showNew ? 'Cancelar' : 'Nueva plantilla'}
          </Button>
        </div>

        {showNew && <NewTemplateForm onClose={() => setShowNew(false)} />}

        {isLoading ? (
          <LoadingState />
        ) : (
          templates.map((t) => <TemplateCard key={t.id} template={t} />)
        )}
      </div>
    </>
  );
}
