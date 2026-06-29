"use client";

import { useEffect, useRef } from "react";

/** Calls `onIntersect` when the returned ref enters the viewport. */
export function useIntersection(onIntersect: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && onIntersect(),
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);
  return ref;
}
