"use client";

import { Check, Copy, KeyRound, Plus, Ticket, UserRound } from "lucide-react";
import { useState } from "react";
import type { DemoCredentialType } from "@/lib/demo/types";

export const CREDENTIAL_TYPE_LABELS: Record<DemoCredentialType, string> = {
  line: "Usuario y contraseña",
  activecode: "Código de activación",
};

const CREDENTIAL_TYPES = [
  {
    id: "line" as const,
    detail: "El visitante recibe un usuario y una contraseña.",
    icon: UserRound,
  },
  {
    id: "activecode" as const,
    detail: "El visitante recibe un código para activar en su app.",
    icon: Ticket,
  },
];

interface CodeGeneratorProps {
  code: string | null;
  createdType: DemoCredentialType | null;
  credentialType: DemoCredentialType;
  busy: boolean;
  onCredentialTypeChange(value: DemoCredentialType): void;
  onCreate(): Promise<void>;
}

export function CodeGenerator({
  code,
  createdType,
  credentialType,
  busy,
  onCredentialTypeChange,
  onCreate,
}: CodeGeneratorProps) {
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

      <fieldset className="n7-admin-type-fieldset" disabled={busy}>
        <legend>Qué recibirá el visitante</legend>
        <div className="n7-admin-type-grid">
          {CREDENTIAL_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <label
                className="n7-admin-type-option"
                data-selected={credentialType === item.id}
                key={item.id}
              >
                <input
                  type="radio"
                  name="credentialType"
                  value={item.id}
                  checked={credentialType === item.id}
                  onChange={() => onCredentialTypeChange(item.id)}
                />
                <span className="n7-admin-type-icon">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <strong>{CREDENTIAL_TYPE_LABELS[item.id]}</strong>
                <small>{item.detail}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button className="n7-admin-primary" type="button" disabled={busy} onClick={() => void onCreate()}>
        <Plus size={18} /> {busy ? "Creando…" : "Crear código"}
      </button>

      {code ? (
        <div className="n7-admin-new-code" role="status">
          <div>
            <small>CÓPIALO AHORA · NO VOLVERÁ A MOSTRARSE</small>
            <strong>{code}</strong>
            {createdType ? (
              <em className="n7-admin-new-code-type">
                Entrega: {CREDENTIAL_TYPE_LABELS[createdType].toLowerCase()}
              </em>
            ) : null}
          </div>
          <button type="button" onClick={() => void copyCode()} aria-label="Copiar código">
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar código"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
