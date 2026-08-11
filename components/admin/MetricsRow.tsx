"use client";

import { useMemo } from "react";
import { KeyRound, MessageCircle, Percent, Tv, Zap } from "lucide-react";
import type { AdminCodeView } from "@/lib/demo/admin-client";
import { summarizeCodes } from "@/lib/demo/metrics";

const percent = new Intl.NumberFormat("es", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function MetricsRow({ codes }: { codes: AdminCodeView[] }) {
  const metrics = useMemo(() => summarizeCodes(codes), [codes]);
  const split = metrics.fullHour + metrics.longDemo;
  const fullShare = split === 0 ? 0 : (metrics.fullHour / split) * 100;

  return (
    <section className="ca-metrics" aria-label="Resumen de los pases cargados">
      <article className="ca-metric">
        <KeyRound aria-hidden="true" size={17} />
        <p>Pases emitidos</p>
        <strong>{metrics.issued}</strong>
        <small>En la lista cargada</small>
      </article>

      <article className="ca-metric">
        <Zap aria-hidden="true" size={17} />
        <p>Activados</p>
        <strong>{metrics.activated}</strong>
        <small>Alguien escribió el código</small>
      </article>

      <article className="ca-metric">
        <MessageCircle aria-hidden="true" size={17} />
        <p>Demos entregadas</p>
        <strong>{metrics.delivered}</strong>
        <small>{metrics.sent} salieron por WhatsApp</small>
      </article>

      <article className="ca-metric" data-accent="true">
        <Percent aria-hidden="true" size={17} />
        <p>Conversión</p>
        <strong>{percent.format(metrics.conversion)}</strong>
        <small>De pase emitido a demo entregada</small>
      </article>

      <article className="ca-metric ca-metric-split">
        <Tv aria-hidden="true" size={17} />
        <p>Qué eligen</p>
        <strong>
          {metrics.fullHour} <span>·</span> {metrics.longDemo}
        </strong>
        <div
          className="ca-split-bar"
          role="img"
          aria-label={`${metrics.fullHour} eligieron 1 hora FULL y ${metrics.longDemo} eligieron 4 horas`}
        >
          <i style={{ width: `${fullShare}%` }} />
        </div>
        <small>1 hora FULL · 4 horas</small>
      </article>
    </section>
  );
}
