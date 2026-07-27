"use client";

import { useEffect, useState } from "react";

const SHUTDOWN_AT = new Date("2026-07-30T12:00:00Z").getTime();

function getRemaining() {
  const diff = Math.max(0, SHUTDOWN_AT - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function ShuttingDownPage() {
  const [remaining, setRemaining] = useState(getRemaining());

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const done = remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#141414] px-4 text-center">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Bankai is shutting down</h1>
      <p className="mt-3 max-w-sm text-sm text-white/50">
        {done ? "This project is offline." : "Thanks for stopping by."}
      </p>

      {!done && (
        <div className="mt-10 flex items-center gap-4 sm:gap-6">
          {[
            { label: "Days", value: remaining.days },
            { label: "Hours", value: remaining.hours },
            { label: "Minutes", value: remaining.minutes },
            { label: "Seconds", value: remaining.seconds },
          ].map(({ label, value }) => (
            <div key={label} className="w-16 sm:w-20">
              <p className="font-mono text-3xl font-bold text-primary sm:text-4xl">
                {String(value).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
