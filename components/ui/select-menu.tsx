"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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
  /** Max height of the dropdown list (default 200px) */
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const label    = selected?.label ?? placeholder;

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          "bg-white/10 text-white/85 hover:bg-white/15",
          open ? "bg-white/15" : "",
        ].join(" ")}
      >
        {icon && <span className="shrink-0 text-white/50">{icon}</span>}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          className={["size-3.5 text-white/40 transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-full overflow-y-auto rounded-xl border border-white/[0.07] bg-[#1a1a1a] py-1 shadow-2xl"
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
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  opt.disabled
                    ? "cursor-not-allowed text-white/25"
                    : isActive
                    ? "bg-primary/15 text-primary"
                    : "text-white/75 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                {isActive && (
                  <svg viewBox="0 0 10 10" className="size-2.5 shrink-0 fill-primary">
                    <circle cx="5" cy="5" r="5" />
                  </svg>
                )}
                {!isActive && <span className="size-2.5 shrink-0" />}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
