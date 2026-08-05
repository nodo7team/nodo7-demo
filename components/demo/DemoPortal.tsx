"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { AccessCodeForm } from "@/components/demo/AccessCodeForm";
import { DemoCountdown } from "@/components/demo/DemoCountdown";
import { DemoResult } from "@/components/demo/DemoResult";
import { DemoSetupForm } from "@/components/demo/DemoSetupForm";
import type { DemoPackageId, DemoResultView, DemoSessionView } from "@/lib/demo/types";

type PortalState =
  | { kind: "access" }
  | { kind: "setup"; deadline: string; deliveryOnly: boolean }
  | { kind: "result"; deadline: string; result: DemoResultView }
  | { kind: "expired" };

const PANEL_COPY: Record<PortalState["kind"], { step: string; title: string }> = {
  access: { step: "PASO 1 DE 3", title: "Ingresa tu pase" },
  setup: { step: "PASO 2 DE 3", title: "Arma tu demo" },
  result: { step: "PASO 3 DE 3", title: "Tu acceso está listo" },
  expired: { step: "PASE CERRADO", title: "Sesión finalizada" },
};

function portalState(session: DemoSessionView): PortalState {
  if (session.state === "setup") {
    return {
      kind: "setup",
      deadline: session.deadline,
      deliveryOnly: session.deliveryOnly,
    };
  }
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

  async function generate(input: {
    name: string;
    packageId: DemoPackageId;
    countryIso: string;
    phone: string;
  }) {
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
  const panel = PANEL_COPY[state.kind];

  return (
    <main className="ca-shell">
      <section className="ca-brand">
        <div className="ca-lockup">
          <Image
            src="/brand/clientarea-logo.png"
            alt="ClientArea by Nodo 7 OTT"
            width={1189}
            height={379}
            priority
          />
        </div>
        <p className="ca-eyebrow">Pase de prueba · un solo uso</p>
        <h1>Enciende la señal.</h1>
        <p className="ca-lede">
          Tienes un código de un solo uso. Elige cuánto quieres probar y te
          mandamos el acceso <b>por WhatsApp</b>, en segundos.
        </p>
        <ul className="ca-trust">
          <li><LockKeyhole aria-hidden="true" size={15} /> Un código, una demo</li>
          <li><MessageCircle aria-hidden="true" size={15} /> Llega a tu WhatsApp</li>
          <li><ShieldCheck aria-hidden="true" size={15} /> Sin tarjeta ni datos de pago</li>
        </ul>
      </section>

      <section className="ca-monitor" aria-labelledby="ca-panel-title">
        <div className="ca-screen">
          {timed ? (
            <DemoCountdown deadline={state.deadline} onExpire={expire} />
          ) : (
            <>
              <div className="ca-tc">
                <span className="ca-onair" data-live="false">
                  <i aria-hidden="true" /> {state.kind === "expired" ? "FUERA DE AIRE" : "EN ESPERA"}
                </span>
                <span className="ca-tc-label">TIEMPO RESTANTE</span>
                <strong className="ca-tc-value">--:--</strong>
              </div>
              <div
                className="ca-drain"
                style={{ "--ca-progress": "0%" } as React.CSSProperties}
                aria-hidden="true"
              >
                <i />
              </div>
            </>
          )}

          <div className="ca-screen-body">
            <div className="ca-screen-head">
              {state.kind === "result" ? (
                <span className="ca-result-mark">
                  <Check aria-hidden="true" size={26} strokeWidth={3} />
                </span>
              ) : null}
              <div>
                <p className="ca-eyebrow">{panel.step}</p>
                <h2 id="ca-panel-title">{panel.title}</h2>
              </div>
            </div>

            {state.kind === "access" ? (
              <AccessCodeForm busy={busy} error={error} onSubmit={activate} />
            ) : null}
            {state.kind === "setup" ? (
              <DemoSetupForm
                busy={busy}
                error={error}
                deliveryOnly={state.deliveryOnly}
                onSubmit={generate}
              />
            ) : null}
            {state.kind === "result" ? <DemoResult result={state.result} /> : null}
            {state.kind === "expired" ? (
              <div className="ca-expired" aria-live="polite">
                <strong>00:00</strong>
                <p>
                  Este pase ya se usó y no puede reutilizarse. Pide uno nuevo a
                  quien te lo envió para empezar otra demo.
                </p>
                <button
                  className="ca-button ca-button-quiet"
                  type="button"
                  onClick={() => { setError(null); setState({ kind: "access" }); }}
                >
                  <RotateCcw aria-hidden="true" size={17} /> Ingresar otro código
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ca-monitor-foot">
          <span>CLIENTAREA · NODO 7 OTT</span>
          <span>CONEXIÓN SEGURA</span>
        </div>
      </section>
    </main>
  );
}
