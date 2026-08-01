"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Globe,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Check,
  Moon,
  Monitor,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useLanguageStore, type TitleLanguage } from "@/store/language-store";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

type Section = "account" | "appearance" | "language" | "notifications" | "privacy";

const SECTIONS: { key: Section; label: string; icon: typeof User }[] = [
  { key: "account", label: "Account", icon: User },
  { key: "appearance", label: "Appearance", icon: Monitor },
  { key: "language", label: "Language", icon: Globe },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy & Data", icon: Shield },
];

const TITLE_LANGUAGES: { value: TitleLanguage; label: string; hint: string }[] = [
  { value: "english", label: "English", hint: "Prefer English titles when available" },
  { value: "romaji", label: "Romaji", hint: "Romanized Japanese titles" },
  { value: "native", label: "Native (日本語)", hint: "Original Japanese titles" },
];

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-white/8 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-white/45">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-white/20"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function SettingsView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const remember = useAuthStore((s) => s.remember);
  const setRemember = useAuthStore((s) => s.setRemember);
  const titleLanguage = useLanguageStore((s) => s.titleLanguage);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);

  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("account");

  // notification toggles (UI-only for now)
  const [notifNewEp, setNotifNewEp] = useState(true);
  const [notifTrending, setNotifTrending] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[1100px] px-6 pb-16 pt-24 sm:px-10">
        <h1 className="mb-8 text-2xl font-bold text-white sm:text-3xl">Settings</h1>

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <nav className="space-y-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  activeSection === key
                    ? "bg-primary/15 text-primary"
                    : "text-white/60 hover:bg-white/6 hover:text-white"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/4 p-6"
          >
            {activeSection === "account" && (
              <div>
                <h2 className="mb-5 text-base font-bold text-white">Account</h2>
                <SettingRow
                  label="Username"
                  hint="Your unique display name on Bankai"
                >
                  <span className="text-sm text-white/60">{currentUser}</span>
                </SettingRow>
                <SettingRow
                  label="Stay signed in"
                  hint="Keep your session after closing the browser"
                >
                  <Toggle checked={remember} onChange={setRemember} />
                </SettingRow>
                <SettingRow label="Profile" hint="Edit avatar, banner and display info">
                  <Link
                    href="/profile"
                    className="flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    Go to Profile
                    <ChevronRight className="size-4" />
                  </Link>
                </SettingRow>

                <div className="mt-6 space-y-3 border-t border-white/8 pt-6">
                  <button
                    onClick={() => {
                      logout();
                      router.replace("/");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/6 hover:text-white"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/8">
                    <Trash2 className="size-4" />
                    Delete account
                    <span className="ml-auto text-xs text-white/30">Coming soon</span>
                  </button>
                </div>
              </div>
            )}

            {activeSection === "appearance" && (
              <div>
                <h2 className="mb-5 text-base font-bold text-white">Appearance</h2>
                <SettingRow label="Theme" hint="Bankai always runs in dark mode for the best viewing experience">
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5">
                    <Moon className="size-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Dark</span>
                    <Check className="size-3.5 text-primary" />
                  </div>
                </SettingRow>
                <SettingRow label="Card size" hint="Coming in a future update">
                  <span className="text-xs text-white/35">Coming soon</span>
                </SettingRow>
                <SettingRow label="Autoplay next episode" hint="Automatically start the next episode when one ends">
                  <Toggle checked={true} onChange={() => {}} />
                </SettingRow>
              </div>
            )}

            {activeSection === "language" && (
              <div>
                <h2 className="mb-5 text-base font-bold text-white">Language & Titles</h2>
                <div className="space-y-2">
                  {TITLE_LANGUAGES.map(({ value, label, hint }) => (
                    <button
                      key={value}
                      onClick={() => setTitleLanguage(value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all",
                        titleLanguage === value
                          ? "border-primary/50 bg-primary/10"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
                      )}
                    >
                      <div>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            titleLanguage === value ? "text-primary" : "text-white"
                          )}
                        >
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-white/45">{hint}</p>
                      </div>
                      {titleLanguage === value && (
                        <Check className="size-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div>
                <h2 className="mb-5 text-base font-bold text-white">Notifications</h2>
                <SettingRow
                  label="New episode alerts"
                  hint="Notify when a new episode drops for anime in your Watching list"
                >
                  <Toggle checked={notifNewEp} onChange={setNotifNewEp} />
                </SettingRow>
                <SettingRow
                  label="Trending highlights"
                  hint="Weekly digest of what's blowing up this season"
                >
                  <Toggle checked={notifTrending} onChange={setNotifTrending} />
                </SettingRow>
                <p className="mt-6 text-xs text-white/30">
                  Push notifications require a supported browser and your permission. Actual delivery is coming in a future update.
                </p>
              </div>
            )}

            {activeSection === "privacy" && (
              <div>
                <h2 className="mb-5 text-base font-bold text-white">Privacy & Data</h2>
                <SettingRow
                  label="Watch history"
                  hint="Records episodes you've watched for the Continue Watching section"
                >
                  <Toggle checked={true} onChange={() => {}} />
                </SettingRow>
                <SettingRow
                  label="Clear watch history"
                  hint="Remove all history entries — this cannot be undone"
                >
                  <button className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white">
                    Clear History
                  </button>
                </SettingRow>
                <SettingRow
                  label="Export my data"
                  hint="Download a copy of your lists and history"
                >
                  <span className="text-xs text-white/30">Coming soon</span>
                </SettingRow>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
