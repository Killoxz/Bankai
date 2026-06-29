"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";

/** Live-ticking countdown to a unix (seconds) timestamp. */
export function Countdown({ airingAt }: { airingAt: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = airingAt - now;
  if (remaining <= 0) {
    return <span className="text-emerald-400">Aired</span>;
  }

  // Show H:MM:SS when under an hour, otherwise compact "2d 4h".
  if (remaining < 3600) {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return (
      <span className="tabular-nums text-primary">
        {m}m {String(s).padStart(2, "0")}s
      </span>
    );
  }
  return <span className="tabular-nums text-primary">{formatCountdown(remaining)}</span>;
}
