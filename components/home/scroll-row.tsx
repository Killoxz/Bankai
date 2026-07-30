"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  });

  const scrollByDir = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrowBase =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity hover:bg-black group-hover/row:opacity-100 sm:grid place-items-center";

  return (
    <div className="group/row relative">
      <div
        ref={scroller}
        onScroll={update}
        className={`no-scrollbar flex overflow-x-auto ${className ?? ""}`}
      >
        {children}
      </div>

      {canLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 -left-1 z-[5] w-14 bg-gradient-to-r from-[#141414] to-transparent sm:w-20" />
          <button onClick={() => scrollByDir(-1)} aria-label="Scroll left" className={`${arrowBase} -left-4`}>
            <ChevronLeft className="size-5" />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 -right-1 z-[5] w-14 bg-gradient-to-l from-[#141414] to-transparent sm:w-20" />
          <button onClick={() => scrollByDir(1)} aria-label="Scroll right" className={`${arrowBase} -right-4`}>
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}
