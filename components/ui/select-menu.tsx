"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
}

export function SelectMenu({
  value,
  options,
  onChange,
  icon,
  placeholder = "Select…",
  className = "",
  maxHeight = 200,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
          "bg-white/10 text-white hover:bg-white/15",
          open ? "bg-white/15" : "",
        ].join(" ")}
      >
        {icon && <span className="shrink-0 text-white/60">{icon}</span>}
        <span className="max-w-[130px] truncate">{label}</span>
        <ChevronDown
          className={[
            "size-3.5 shrink-0 text-white/40 transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[140px] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#1c1c1c] py-1.5 shadow-2xl shadow-black/60"
          style={{ maxHeight }}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={[
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                  opt.disabled
                    ? "cursor-not-allowed text-white/20"
                    : isActive
                    ? "text-primary"
                    : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                <span className="truncate">{opt.label}</span>
                {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
