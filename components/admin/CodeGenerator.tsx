"use client";

import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";

interface CodeGeneratorProps {
  code: string | null;
  busy: boolean;
  onCreate(): Promise<void>;
}

export function CodeGenerator({ code, busy, onCreate }: CodeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <section className="n7-admin-generator" aria-labelledby="generator-title">
      <div>
        <span><KeyRound size={16} /> EMISIÓN DE PASES</span>
        <h2 id="generator-title">Crear acceso de un solo uso</h2>
        <p>El tiempo no empieza hasta que el visitante introduce el código.</p>
      </div>
      <button className="n7-admin-primary" type="button" disabled={busy} onClick={() => void onCreate()}>
        <Plus size={18} /> {busy ? "Creando…" : "Crear código"}
      </button>
      {code ? (
        <div className="n7-admin-new-code" role="status">
          <div><small>CÓPIALO AHORA · NO VOLVERÁ A MOSTRARSE</small><strong>{code}</strong></div>
          <button type="button" onClick={() => void copyCode()} aria-label="Copiar código">
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar código"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
