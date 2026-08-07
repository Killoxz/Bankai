"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsModalStore } from "@/store/settings-modal-store";
import { SettingsView } from "@/components/settings/settings-view";

export function SettingsModal() {
  const open       = useSettingsModalStore((s) => s.open);
  const initialTab = useSettingsModalStore((s) => s.initialTab);
  const setOpen    = useSettingsModalStore((s) => s.setOpen);

  function close() { setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-full items-start justify-center p-4 pt-12 sm:p-8 sm:pt-16">
              <div className="w-full max-w-[1100px]">
                <SettingsView onClose={close} initialTab={initialTab} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
