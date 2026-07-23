"use client";

import { useEffect, useState } from "react";

interface DemoCountdownProps {
  deadline: string;
  onExpire(): void;
}

function secondsUntil(deadline: string): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1_000));
}

export function DemoCountdown({ deadline, onExpire }: DemoCountdownProps) {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    const update = () => {
      const next = secondsUntil(deadline);
      setSeconds(next);
      if (next === 0) onExpire();
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline, onExpire]);

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  const progress = Math.max(0, Math.min(1, seconds / 600));

  return (
    <div
      className="n7-countdown"
      style={{ "--n7-progress": `${progress * 360}deg` } as React.CSSProperties}
      aria-live="polite"
      aria-label={`${minutes} minutos y ${remainder} segundos restantes`}
    >
      <span className="n7-countdown-kicker">VENTANA ACTIVA</span>
      <strong>{minutes}:{remainder}</strong>
      <span>para generar y leer tu demo</span>
    </div>
  );
}
