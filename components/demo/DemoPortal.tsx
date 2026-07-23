"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { AccessCodeForm } from "@/components/demo/AccessCodeForm";
import { DemoCountdown } from "@/components/demo/DemoCountdown";
import { DemoResult } from "@/components/demo/DemoResult";
import { DemoSetupForm } from "@/components/demo/DemoSetupForm";
import type { DemoPackageId, DemoResultView, DemoSessionView } from "@/lib/demo/types";

type PortalState =
  | { kind: "access" }
  | { kind: "setup"; deadline: string }
  | { kind: "result"; deadline: string; result: DemoResultView }
  | { kind: "expired" };

function portalState(session: DemoSessionView): PortalState {
  if (session.state === "setup") return { kind: "setup", deadline: session.deadline };
  if (session.state === "result") {
    return { kind: "result", deadline: session.deadline, result: session.result };
  }
  return session.state === "expired" ? { kind: "expired" } : { kind: "access" };
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No se pudo completar la solicitud.");
  return payload;
}

export function DemoPortal({ initialSession }: { initialSession: DemoSessionView }) {
  const [state, setState] = useState<PortalState>(() => portalState(initialSession));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/demo/session", { cache: "no-store" })
      .then((response) => responseJson<DemoSessionView>(response))
      .then((session) => { if (mounted) setState(portalState(session)); })
      .catch(() => { /* Keep the server-rendered state. */ });
    return () => { mounted = false; };
  }, []);

  const expire = useCallback(() => setState({ kind: "expired" }), []);

  async function activate(code: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setState(portalState(await responseJson<DemoSessionView>(response)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código no disponible.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(input: { name: string; packageId: DemoPackageId }) {
    if (state.kind !== "setup") return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await responseJson<DemoResultView>(response);
      setState({ kind: "result", deadline: state.deadline, result });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo generar la demo.");
    } finally {
      setBusy(false);
    }
  }

  const timed = state.kind === "setup" || state.kind === "result";

  return (
    <main className="n7-shell">
      <section className="n7-brand-panel" aria-labelledby="n7-title">
        <div className="n7-brand-lockup">
          <Image src="/brand/nodo7-logo.png" alt="NODO7 OTT" width={800} height={216} priority />
        </div>
        <div className="n7-brand-copy">
          <p className="n7-eyebrow">PASE DE PRUEBA · ACCESO ÚNICO</p>
          <h1 id="n7-title">Tu señal empieza cuando tú decides.</h1>
          <p>Usa el código que recibiste. Tendrás diez minutos para elegir tu demo, generarla y guardar el acceso.</p>
        </div>
        <div className="n7-trust-list" aria-label="Condiciones del acceso">
          <span><LockKeyhole size={16} /> Código de un solo uso</span>
          <span><ShieldCheck size={16} /> Credenciales protegidas</span>
        </div>
      </section>

      <section className="n7-ticket" aria-label="Acceso a demo NODO7">
        <header className="n7-ticket-header">
          <div>
            <span>ACCESO / N7</span>
            <strong>
              {state.kind === "access" && "Ingresa tu pase"}
              {state.kind === "setup" && "Configura tu demo"}
              {state.kind === "result" && "Demo lista"}
              {state.kind === "expired" && "Sesión finalizada"}
            </strong>
          </div>
          <span className="n7-ticket-status" data-active={timed}>
            {timed ? "EN VIVO" : state.kind === "expired" ? "CERRADO" : "EN ESPERA"}
          </span>
        </header>

        {timed ? <DemoCountdown deadline={state.deadline} onExpire={expire} /> : null}

        <div className="n7-ticket-body">
          {state.kind === "access" ? <AccessCodeForm busy={busy} error={error} onSubmit={activate} /> : null}
          {state.kind === "setup" ? <DemoSetupForm busy={busy} error={error} onSubmit={generate} /> : null}
          {state.kind === "result" ? <DemoResult result={state.result} /> : null}
          {state.kind === "expired" ? (
            <div className="n7-expired" aria-live="polite">
              <strong>00:00</strong>
              <h2>Sesión finalizada</h2>
              <p>Este código ya no puede reutilizarse. Solicita uno nuevo para iniciar otra demo.</p>
              <button
                className="n7-secondary-button"
                type="button"
                onClick={() => { setError(null); setState({ kind: "access" }); }}
              >
                <RotateCcw size={17} /> Ingresar otro código
              </button>
            </div>
          ) : null}
        </div>

        <footer className="n7-ticket-footer"><span>NODO7 OTT</span><span>SESIÓN SEGURA · 10 MIN</span></footer>
      </section>
    </main>
  );
}
