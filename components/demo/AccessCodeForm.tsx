"use client";

import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";

interface AccessCodeFormProps {
  busy: boolean;
  error: string | null;
  onSubmit(code: string): Promise<void>;
}

export function AccessCodeForm({ busy, error, onSubmit }: AccessCodeFormProps) {
  const [code, setCode] = useState("");

  return (
    <form
      className="n7-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(code);
      }}
    >
      <div className="n7-field">
        <label htmlFor="access-code">Código de acceso</label>
        <div className="n7-input-wrap">
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
        <p className="n7-field-hint">
          El reloj empieza recién cuando el código es aceptado.
        </p>
      </div>

      {error ? <p className="n7-error" role="alert">{error}</p> : null}

      <button className="n7-primary-button" type="submit" disabled={busy}>
        <span>{busy ? "Validando código…" : "Continuar"}</span>
        <ArrowRight aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
