'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const SHORTCUTS = [
  { keys: ['g', 'd'], desc: 'Ir a Dashboard',       group: 'Navegación' },
  { keys: ['g', 'v'], desc: 'Ir a Vencimientos',    group: 'Navegación' },
  { keys: ['g', 'c'], desc: 'Ir a Clientes',         group: 'Navegación' },
  { keys: ['g', 'l'], desc: 'Ir a Líneas',           group: 'Navegación' },
  { keys: ['g', 'p'], desc: 'Ir a Plantillas',       group: 'Navegación' },
  { keys: ['g', 'a'], desc: 'Ir a Historial',        group: 'Navegación' },
  { keys: ['n'],      desc: 'Nueva línea',            group: 'Acciones' },
  { keys: ['?'],      desc: 'Mostrar esta ayuda',     group: 'Ayuda' },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 text-xs font-mono font-bold bg-bg border border-border rounded-lg text-fg shadow-sm">
      {children}
    </kbd>
  );
}

export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const navigate = useCallback((path: string) => {
    router.push(path);
    setPendingG(false);
  }, [router]);

  // Reset "g" pending after 1.5s
  useEffect(() => {
    if (!pendingG) return;
    const t = setTimeout(() => setPendingG(false), 1500);
    return () => clearTimeout(t);
  }, [pendingG]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'escape') { setShowHelp(false); setPendingG(false); return; }
      if (key === '?') { e.preventDefault(); setShowHelp((v) => !v); return; }
      if (key === 'n' && !pendingG) { e.preventDefault(); navigate('/lines/new'); return; }

      if (pendingG) {
        e.preventDefault();
        if (key === 'd') navigate('/dashboard');
        else if (key === 'v') navigate('/expiring-today');
        else if (key === 'c') navigate('/clients');
        else if (key === 'l') navigate('/lines');
        else if (key === 'p') navigate('/templates');
        else if (key === 'a') navigate('/activity');
        else setPendingG(false);
        return;
      }

      if (key === 'g') { e.preventDefault(); setPendingG(true); }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [pendingG, navigate]);

  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];

  return (
    <>
      {/* Modal de ayuda */}
      <Dialog open={showHelp} onClose={() => setShowHelp(false)} title="Atajos de teclado">
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-2">{group}</p>
              <div className="space-y-1">
                {SHORTCUTS.filter((s) => s.group === group).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-fg">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && <span className="text-xs text-fg-subtle">luego</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-fg-subtle text-center pt-1">
            Los atajos no funcionan cuando el foco está en un campo de texto
          </p>
        </div>
      </Dialog>

      {/* Indicador "G presionado" */}
      {pendingG && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex items-center gap-2 bg-bg-elevated border border-accent/30 rounded-xl px-4 py-2.5 shadow-2xl animate-fade-in">
          <Keyboard className="h-3.5 w-3.5 text-accent" />
          <span className="text-sm font-mono">
            <span className="font-bold text-accent">g</span>
            <span className="text-fg-subtle"> → d / v / c / l / p / a</span>
          </span>
        </div>
      )}
    </>
  );
}
