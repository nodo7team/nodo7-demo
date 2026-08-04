"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import type { DemoResultView } from "@/lib/demo/types";

export function DemoResult({ result }: { result: DemoResultView }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(kind: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="n7-result">
      <div className="n7-result-heading">
        <span className="n7-success-mark"><ShieldCheck aria-hidden="true" size={22} /></span>
        <div><p>DEMO CONFIRMADA</p><h2>Tu acceso está listo</h2></div>
      </div>

      {result.kind === "activecode" ? (
        <dl className="n7-credentials n7-credentials-single">
          <div>
            <dt>Código de activación</dt><dd>{result.code}</dd>
            <button type="button" aria-label="Copiar código" onClick={() => void copy("code", result.code)}>
              {copied === "code" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </dl>
      ) : (
        <dl className="n7-credentials">
          <div>
            <dt>Usuario</dt><dd>{result.username}</dd>
            <button type="button" aria-label="Copiar usuario" onClick={() => void copy("username", result.username)}>
              {copied === "username" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div>
            <dt>Contraseña</dt><dd>{result.password}</dd>
            <button type="button" aria-label="Copiar contraseña" onClick={() => void copy("password", result.password)}>
              {copied === "password" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </dl>
      )}

      <div className="n7-result-meta">
        <span>{result.packageName}</span>
        <span>
          {result.kind === "activecode"
            ? "El tiempo empieza cuando actives el código"
            : result.expiresAt
              ? `Vence ${result.expiresAt}`
              : "Duración definida por el proveedor"}
        </span>
      </div>
      <p className="n7-result-warning">Guarda los datos ahora: dejarán de mostrarse cuando termine el reloj.</p>
    </div>
  );
}
