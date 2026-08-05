"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Tv, TriangleAlert } from "lucide-react";
import { packageSummary } from "@/lib/demo/packages";
import type { DemoResultView } from "@/lib/demo/types";

function DeliveryNotice({ result }: { result: DemoResultView }) {
  const { status, maskedPhone } = result.delivery;

  if (status === "sent") {
    return (
      <p className="ca-alert ca-alert-good" role="status">
        <MessageCircle aria-hidden="true" size={22} />
        <span>
          <strong>Te lo enviamos por WhatsApp.</strong>
          Abre el chat de {maskedPhone ?? "tu número"}. Puede tardar hasta un
          minuto en llegar.
        </span>
      </p>
    );
  }

  if (status === "failed") {
    return (
      <p className="ca-alert ca-alert-danger" role="alert">
        <TriangleAlert aria-hidden="true" size={22} />
        <span>
          <strong>No pudimos enviarte el WhatsApp.</strong>
          {result.kind === "delivered"
            ? "Escríbenos por el mismo medio donde pediste la demo y te reenviamos el acceso."
            : "Copia los datos de esta pantalla antes de que se acabe el reloj."}
        </span>
      </p>
    );
  }

  return null;
}

export function DemoResult({ result }: { result: DemoResultView }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="ca-result">
      <DeliveryNotice result={result} />

      {result.kind === "delivered" ? null : result.kind === "activecode" ? (
        <dl className="ca-creds ca-creds-single">
          <div>
            <dt>Código de activación</dt><dd>{result.code}</dd>
            <button type="button" aria-label="Copiar código" onClick={() => void copy("code", result.code)}>
              {copied === "code" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </dl>
      ) : (
        <dl className="ca-creds">
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

      {result.kind === "delivered" ? null : (
        <p className="ca-alert ca-alert-loud">
          <TriangleAlert aria-hidden="true" size={22} />
          <span>
            <strong>Guárdalo ahora.</strong>
            Cuando el reloj llegue a cero, esta pantalla deja de mostrarlo.
          </span>
        </p>
      )}

      <div className="ca-result-meta">
        <span><Tv aria-hidden="true" size={15} /> <strong>{result.packageName}</strong></span>
        <span>
          {result.kind === "activecode"
            ? "El tiempo empieza cuando la actives"
            : result.expiresAt
              ? `Vence ${result.expiresAt}`
              : "Duración definida por el proveedor"}
        </span>
      </div>

      <p className="ca-hint">{packageSummary(result.packageId)}</p>
    </div>
  );
}
