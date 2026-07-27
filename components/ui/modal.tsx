"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 500,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full rounded-xl border border-white/10 bg-[#181818] p-7 shadow-2xl"
        style={{ maxWidth }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-white/50 transition-colors hover:text-white"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}
