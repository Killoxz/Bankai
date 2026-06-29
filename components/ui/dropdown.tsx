"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Lightweight click-to-open menu (shadcn-style API without the Radix dep).
 * Closes on outside-click and Escape.
 */
export function Dropdown({
  trigger,
  children,
  align = "end",
  side = "bottom",
  className,
  closeOnItemClick = true,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  className?: string;
  closeOnItemClick?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const setOpenWithCallback = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpen(prev => {
      const next = typeof value === "function" ? value(prev) : value;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenWithCallback(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenWithCallback(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpenWithCallback((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "absolute z-50 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl",
              side === "top" ? "bottom-full mb-2" : "mt-2",
              align === "end" ? "right-0" : "left-0",
              className
            )}
            onClick={closeOnItemClick ? () => setOpenWithCallback(false) : undefined}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}
