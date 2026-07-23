"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import type { DemoResultView } from "@/lib/demo/types";

export function DemoResult({ result }: { result: DemoResultView }) {
  const [copied, setCopied] = useState<"username" | "password" | null>(null);

  async function copy(kind: "username" | "password", value: string) {
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
      <div className="n7-result-meta">
        <span>{result.packageName}</span>
        <span>{result.expiresAt ? `Vence ${result.expiresAt}` : "Duración definida por el proveedor"}</span>
      </div>
      <p className="n7-result-warning">Guarda los datos ahora: dejarán de mostrarse cuando termine el reloj.</p>
    </div>
  );
}
