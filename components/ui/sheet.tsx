"use client";

import * as React from "react";
import { AnimatePresence, motion, type Target } from "framer-motion";
import { cn } from "@/lib/utils";

type Side = "left" | "right" | "bottom";

const variants: Record<Side, { initial: Target; animate: Target; className: string }> = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    className: "left-0 top-0 h-full w-[85vw] max-w-sm border-r",
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    className: "right-0 top-0 h-full w-[85vw] max-w-sm border-l",
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    className: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t",
  },
};

export function Sheet({
  open,
  onClose,
  side = "left",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  className?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const v = variants[side];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={v.initial}
            animate={v.animate}
            exit={v.initial}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className={cn(
              "fixed z-[70] bg-card shadow-2xl border border-border",
              v.className,
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
