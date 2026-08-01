import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-7xl font-bold text-white/10">404</p>
      <h1 className="mt-4 text-xl font-semibold text-white">This page isn&apos;t ready yet</h1>
      <p className="mt-2 max-w-sm text-sm text-white/50">
        We&apos;re rebuilding Bankai piece by piece — this part of the site is coming soon.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Back to Home
      </Link>
    </div>
  );
}
