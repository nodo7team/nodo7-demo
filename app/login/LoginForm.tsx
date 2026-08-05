'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Delete } from 'lucide-react';

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
      router.push('/demos');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Error de conexión');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="ca-pin-dots" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <i key={i} data-on={i < pin.length} />
        ))}
      </div>

      {error ? <p className="ca-pin-error" role="alert">{error}</p> : null}

      <div className="ca-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleDigit(String(n))}
            disabled={loading}
          >
            {n}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => handleDigit('0')} disabled={loading}>
          0
        </button>
        <button
          type="button"
          className="ca-pad-del"
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          aria-label="Borrar"
        >
          <Delete size={20} />
        </button>
      </div>

      <footer>PIN de 6 dígitos</footer>
    </div>
  );
}
