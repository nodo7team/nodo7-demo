"use client";

import { useEffect, useState } from "react";

interface DemoCountdownProps {
  deadline: string;
  onExpire(): void;
}

const WINDOW_SECONDS = 600;

function secondsUntil(deadline: string): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1_000));
}

/** The live overlay of a broadcast: on-air light, timecode, and a draining bar. */
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
  const progress = Math.max(0, Math.min(1, seconds / WINDOW_SECONDS));
  const low = seconds <= 60;

  return (
    <>
      <div
        className="ca-tc"
        role="timer"
        aria-label={`Quedan ${minutes} minutos y ${remainder} segundos`}
      >
        <span className="ca-onair" data-live="true">
          <i aria-hidden="true" /> EN VIVO
        </span>
        <span className="ca-tc-label">TIEMPO RESTANTE</span>
        <strong className="ca-tc-value" data-low={low}>
          {minutes}:{remainder}
        </strong>
      </div>
      <div
        className="ca-drain"
        data-low={low}
        style={{ "--ca-progress": `${progress * 100}%` } as React.CSSProperties}
        aria-hidden="true"
      >
        <i />
      </div>
    </>
  );
}
