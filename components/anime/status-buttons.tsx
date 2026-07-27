"use client";

import { useEffect, useState } from "react";
import { Eye, Bookmark, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

type Status = "WATCHING" | "PLAN_TO_WATCH" | "COMPLETED";

const OPTIONS: { key: Status; label: string; icon: typeof Eye }[] = [
  { key: "WATCHING", label: "Watching", icon: Eye },
  { key: "PLAN_TO_WATCH", label: "To Watch", icon: Bookmark },
  { key: "COMPLETED", label: "Watched", icon: Check },
];

export function StatusButtons({ animeId }: { animeId: number }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [status, setStatus] = useState<Status | null>(null);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !currentUser) return;
    fetch(`/api/anime/${animeId}/status?username=${encodeURIComponent(currentUser)}`)
      .then((res) => res.json())
      .then((json) => setStatus(json.status))
      .catch(() => {});
  }, [mounted, currentUser, animeId]);

  async function toggle(key: Status) {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    if (busy) return;
    const next = status === key ? null : key;
    setBusy(true);
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/anime/${animeId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, status: next }),
      });
      const json = await res.json();
      if (!res.ok) setStatus(status); // revert on failure
      else setStatus(json.status);
    } catch {
      setStatus(status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = status === key;
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-black"
                : "bg-white/10 text-white/80 hover:bg-white/15",
            ].join(" ")}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
