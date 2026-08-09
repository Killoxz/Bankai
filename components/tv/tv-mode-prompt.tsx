"use client";

import { Tv2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTvContext } from "./tv-provider";

export function TvModePrompt() {
  const { showPrompt, dismissPrompt, isTvMode, toggle } = useTvContext();

  function activate() {
    if (!isTvMode) toggle();
    dismissPrompt();
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm"
            onClick={dismissPrompt}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 32 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#161616] p-10 text-center shadow-2xl">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/15">
                <Tv2 className="size-10 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-white">Switch to TV Mode?</h2>
              <p className="mt-3 text-lg leading-relaxed text-white/55">
                Looks like you&apos;re navigating with a remote or D-pad. TV Mode gives you a bigger, cleaner interface built for your screen.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  data-tv-focusable
                  autoFocus
                  onClick={activate}
                  className="rounded-2xl bg-primary px-10 py-4 text-lg font-semibold text-black transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/60"
                >
                  Yes, Switch to TV Mode
                </button>
                <button
                  data-tv-focusable
                  onClick={dismissPrompt}
                  className="rounded-2xl border border-white/15 bg-white/5 px-10 py-4 text-lg font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  No thanks
                </button>
              </div>

              <p className="mt-6 text-sm text-white/30">
                You can always toggle TV Mode using the{" "}
                <Tv2 className="inline size-4 align-text-bottom" /> icon in the menu.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
