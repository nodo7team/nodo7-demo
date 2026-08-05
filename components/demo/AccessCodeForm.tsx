"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Timer } from "lucide-react";

interface AccessCodeFormProps {
  busy: boolean;
  error: string | null;
  onSubmit(code: string): Promise<void>;
}

export function AccessCodeForm({ busy, error, onSubmit }: AccessCodeFormProps) {
  const [code, setCode] = useState("");

  return (
    <form
      className="ca-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(code);
      }}
    >
      <div className="ca-field">
        <label htmlFor="access-code">Código de acceso</label>
        <div className="ca-code-input">
          <KeyRound aria-hidden="true" size={19} />
          <input
            id="access-code"
            name="accessCode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="N7-••••-••••-••••-••••-••••"
            minLength={8}
            maxLength={64}
            autoComplete="one-time-code"
            spellCheck={false}
            disabled={busy}
            required
          />
        </div>
        <p className="ca-hint">
          Cópialo tal cual te llegó, con los guiones incluidos.
        </p>
      </div>

      <p className="ca-alert ca-alert-info">
        <Timer aria-hidden="true" size={20} />
        <span>
          <strong>El reloj arranca al aceptar el código.</strong>
          Desde ahí tienes 10 minutos para elegir tu demo y recibirla. Recargar
          la página no reinicia el tiempo.
        </span>
      </p>

      {error ? <p className="ca-error" role="alert">{error}</p> : null}

      <button className="ca-button ca-button-primary" type="submit" disabled={busy}>
        <span>{busy ? "Validando código…" : "Continuar"}</span>
        <ArrowRight aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
