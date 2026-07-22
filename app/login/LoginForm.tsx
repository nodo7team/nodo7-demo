'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const PIN_LENGTH = 6;

export function LoginForm() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDigit = (d: string) => {
    if (loading) return;
    setError(null);
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + d;
      if (next.length === PIN_LENGTH) {
        void submit(next);
      }
      return next;
    });
  };

  const handleDelete = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const submit = async (fullPin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || 'PIN incorrecto');
        setPin('');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de conexión');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PIN display */}
      <div className="rounded-2xl bg-bg-elevated border border-border shadow-sm p-6">
        <div className="flex justify-center gap-3 pt-1">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all duration-200',
                i < pin.length
                  ? 'bg-clicktv-500 border-clicktv-500 scale-110'
                  : 'bg-transparent border-border',
                error && 'animate-shake border-danger',
              )}
            />
          ))}
        </div>

        {error && (
          <div className="text-center text-sm font-medium text-danger mt-4 animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleDigit(String(n))}
            disabled={loading}
            className={cn(
              'h-14 rounded-xl bg-bg-elevated border border-border text-xl font-bold text-fg',
              'hover:bg-clicktv-500/10 hover:border-clicktv-500/30 hover:-translate-y-px',
              'active:translate-y-0 active:scale-[0.97]',
              'transition-all duration-150',
              'disabled:opacity-30 disabled:pointer-events-none',
              'shadow-sm hover:shadow-md',
            )}
          >
            {n}
          </button>
        ))}
        <div /> {/* spacer */}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          disabled={loading}
          className={cn(
            'h-14 rounded-xl bg-bg-elevated border border-border text-xl font-bold text-fg',
            'hover:bg-clicktv-500/10 hover:border-clicktv-500/30 hover:-translate-y-px',
            'active:translate-y-0 active:scale-[0.97]',
            'transition-all duration-150',
            'disabled:opacity-30 disabled:pointer-events-none',
            'shadow-sm hover:shadow-md',
          )}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className={cn(
            'h-14 rounded-xl bg-bg-elevated border border-border text-fg-muted',
            'hover:bg-danger-soft hover:text-danger hover:border-danger/20',
            'active:scale-[0.97] transition-all duration-150',
            'disabled:opacity-20 disabled:pointer-events-none',
            'shadow-sm flex items-center justify-center',
          )}
          aria-label="Borrar"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <p className="text-center text-xs text-fg-subtle mt-4">
        Ingresá tu PIN de 6 dígitos para acceder
      </p>
    </div>
  );
}
