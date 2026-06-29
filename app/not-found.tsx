import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        {/* Stylised 404 */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="text-8xl font-black tracking-tighter text-primary/20 select-none">4</span>
          <svg
            viewBox="0 0 64 64"
            className="size-20 text-primary"
            fill="none"
            aria-hidden
          >
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" opacity="0.15" />
            <path
              d="M20 44 L44 20M30 32 L38 24"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="44" cy="20" r="4" fill="currentColor" />
          </svg>
          <span className="text-8xl font-black tracking-tighter text-primary/20 select-none">4</span>
        </div>

        <h1 className="text-2xl font-bold">Lost in the void</h1>
        <p className="mt-2 text-muted-foreground">
          This page doesn&apos;t exist or was removed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants()}>Back home</Link>
          <Link href="/trending" className={buttonVariants({ variant: "glass" })}>Browse trending</Link>
        </div>
      </div>
    </div>
  );
}
