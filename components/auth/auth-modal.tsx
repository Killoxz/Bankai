"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Lock, User, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const BACKDROP =
  "https://s4.anilist.co/file/anilistcdn/media/anime/banner/178789-9nHWmoRLlcLu.jpg";

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: typeof User;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition-colors focus-within:border-primary">
        <Icon className="size-4 shrink-0 text-white/40" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  );
}

export function AuthModal({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const remember = useAuthStore((s) => s.remember);
  const setRemember = useAuthStore((s) => s.setRemember);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // SSR renders the default (checked); read the persisted value only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const rememberShown = mounted ? remember : true;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!isLogin && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const err = isLogin ? await login(username, password) : await signup(username, password);
    setBusy(false);
    if (err) setError(err);
    else router.push("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141414] px-4">
      {/* Blurred backdrop */}
      <Image
        src={BACKDROP}
        alt=""
        fill
        sizes="100vw"
        aria-hidden
        className="scale-110 object-cover opacity-[0.12] blur-md"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-[860px] overflow-hidden rounded-xl bg-[#181a19] shadow-2xl">
        {/* Left brand panel */}
        <div className="relative hidden w-[260px] shrink-0 overflow-hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-b from-[#8b98a6] via-[#49545f] to-[#0f1418]" />
          <div className="absolute -left-8 top-14 size-44 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute -right-6 top-44 size-36 rounded-full bg-[#2c3c4d]/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-7 bottom-9">
            <Image src="/bankai-icon.svg" alt="Bankai" width={40} height={40} className="h-9 w-auto" />
            <p className="mt-5 text-[22px] font-bold leading-snug text-white">
              Track,
              <br />
              share and
              <br />
              discover
              <br />
              anime<span className="text-primary">.</span>
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="relative flex-1 px-7 py-10 sm:px-12">
          <Link
            href="/"
            aria-label="Close"
            className="absolute right-5 top-5 text-white/50 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </Link>

          <h1 className="text-2xl font-bold text-white">
            {isLogin ? "Welcome back 👋" : "Join Bankai 👋"}
          </h1>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field
              label="Username"
              icon={User}
              value={username}
              onChange={setUsername}
              placeholder="Your username"
            />
            <Field
              label="Password"
              icon={Lock}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />
            {!isLogin && (
              <Field
                label="Confirm Password"
                icon={Lock}
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="••••••••"
              />
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setRemember(!rememberShown)}
                className="flex items-center gap-2 text-xs text-white/80"
              >
                <span
                  className={
                    rememberShown
                      ? "grid size-4 place-items-center rounded border border-primary bg-primary"
                      : "grid size-4 place-items-center rounded border border-white/30"
                  }
                >
                  {rememberShown && <Check className="size-3 text-black" strokeWidth={3} />}
                </span>
                Keep me Logged In
              </button>
              {isLogin && (
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot Password?
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="!mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Please wait…" : isLogin ? "Log In" : "Create Account"}
            </button>
          </form>

          <p className="mt-14 text-xs text-white/50">
            {isLogin ? (
              <>
                Don&apos;t have an account yet?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Join Now
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log In
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
