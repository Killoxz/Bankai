"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Modal({
  open = true,
  title,
  onClose,
  children,
  maxWidth = 500,
}: {
  open?: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />

          {/* Scrollable hit-area — click outside the panel to close */}
          <div
            className="absolute inset-0 overflow-y-auto"
            onClick={onClose}
          >
            {/* py-20 keeps the panel at least 80 px from the top, safely below the navbar */}
            <div className="flex min-h-full items-center justify-center px-4 py-20">
              <motion.div
                className="relative w-full rounded-xl border border-border bg-card p-7 shadow-2xl"
                style={{ maxWidth }}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.86, y: 28 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.86, y: 28 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.9 }}
              >
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-5 top-5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
                <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
                {children}
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
