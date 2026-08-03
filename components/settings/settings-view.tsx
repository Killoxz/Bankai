"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  User, Globe, Bell, Shield, LogOut, ChevronRight, Check,
  Moon, Sun, Monitor, Trash2, Layers, MousePointer2, Sparkles,
  Clapperboard, MessageSquare, Download,
} from "lucide-react";
import { useCardAnimationStore, type CardAnimation } from "@/store/card-animation-store";
import { useAuthStore }      from "@/store/auth-store";
import { useLanguageStore, type TitleLanguage } from "@/store/language-store";
import {
  useSettingsStore,
  type CardLayout, type CardSize, type EpisodeLayout,
} from "@/store/settings-store";
import { PROVIDER_LABELS } from "@/components/watch/episode-utils";
import { Navbar }  from "@/components/layout/navbar";
import { Footer }  from "@/components/layout/footer";
import { cn }      from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select-menu";

type Section = "account" | "appearance" | "language" | "media" | "notifications" | "comments" | "privacy";

const SECTIONS: { key: Section; label: string; icon: typeof User }[] = [
  { key: "account",       label: "Account",        icon: User          },
  { key: "appearance",    label: "Appearance",     icon: Monitor       },
  { key: "language",      label: "Language",       icon: Globe         },
  { key: "media",         label: "Media",          icon: Clapperboard  },
  { key: "notifications", label: "Notifications",  icon: Bell          },
  { key: "comments",      label: "Comments",       icon: MessageSquare },
  { key: "privacy",       label: "Privacy & Data", icon: Shield        },
];

const TITLE_LANGUAGES: { value: TitleLanguage; label: string; hint: string }[] = [
  { value: "english", label: "English",        hint: "Prefer English titles when available" },
  { value: "romaji",  label: "Romaji",         hint: "Romanized Japanese titles"            },
  { value: "native",  label: "Native (日本語)", hint: "Original Japanese titles"             },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-base font-bold text-card-foreground">{children}</h2>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 text-sm font-semibold text-card-foreground">{children}</h3>;
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-card-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-gray-300 dark:bg-white/20"
      )}
    >
      <span className={cn(
        "inline-block size-5 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5"
      )} />
    </button>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all",
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-card-foreground hover:border-primary/30"
            )}
          >
            {Icon && <Icon className="size-4" />}
            {label}
            {active && <Check className="size-3 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsView() {
  const router      = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout      = useAuthStore((s) => s.logout);
  const remember    = useAuthStore((s) => s.remember);
  const setRemember = useAuthStore((s) => s.setRemember);

  const titleLanguage    = useLanguageStore((s) => s.titleLanguage);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const defaultAudio     = useLanguageStore((s) => s.defaultAudio);
  const setDefaultAudio  = useLanguageStore((s) => s.setDefaultAudio);

  const { resolvedTheme, setTheme } = useTheme();
  const { cardAnimation, setCardAnimation } = useCardAnimationStore();

  // ── Settings store ────────────────────────────────────────────────────────
  const showWatchHistory    = useSettingsStore((s) => s.showWatchHistory);
  const setShowWatchHistory = useSettingsStore((s) => s.setShowWatchHistory);
  const cardLayout          = useSettingsStore((s) => s.cardLayout);
  const setCardLayout       = useSettingsStore((s) => s.setCardLayout);
  const cardSize            = useSettingsStore((s) => s.cardSize);
  const setCardSize         = useSettingsStore((s) => s.setCardSize);
  const episodeLayout       = useSettingsStore((s) => s.episodeLayout);
  const setEpisodeLayout    = useSettingsStore((s) => s.setEpisodeLayout);
  const defaultProvider     = useSettingsStore((s) => s.defaultProvider);
  const setDefaultProvider  = useSettingsStore((s) => s.setDefaultProvider);
  const autoPlay            = useSettingsStore((s) => s.autoPlay);
  const setAutoPlay         = useSettingsStore((s) => s.setAutoPlay);
  const autoSkipIntroOutro  = useSettingsStore((s) => s.autoSkipIntroOutro);
  const setAutoSkipIntroOutro = useSettingsStore((s) => s.setAutoSkipIntroOutro);
  const autoNextEpisode     = useSettingsStore((s) => s.autoNextEpisode);
  const setAutoNextEpisode  = useSettingsStore((s) => s.setAutoNextEpisode);
  const showComments        = useSettingsStore((s) => s.showComments);
  const setShowComments     = useSettingsStore((s) => s.setShowComments);
  const notifNewEp          = useSettingsStore((s) => s.notifNewEp);
  const setNotifNewEp       = useSettingsStore((s) => s.setNotifNewEp);
  const notifTrending       = useSettingsStore((s) => s.notifTrending);
  const setNotifTrending    = useSettingsStore((s) => s.setNotifTrending);

  const [mounted, setMounted]             = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [exporting, setExporting]         = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearDone, setClearDone]         = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (mounted && !currentUser) router.replace("/login"); }, [mounted, currentUser, router]);

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  if (!currentUser) return null;

  async function handleExport() {
    if (!currentUser) return;
    setExporting(true);
    try {
      const res  = await fetch(`/api/export?username=${encodeURIComponent(currentUser)}`);
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `bankai-${currentUser}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleClearHistory() {
    if (!currentUser) return;
    setClearingHistory(true);
    try {
      await fetch(`/api/history?username=${encodeURIComponent(currentUser)}`, { method: "DELETE" });
      setClearDone(true);
      setTimeout(() => setClearDone(false), 3000);
    } catch {
      alert("Failed to clear history.");
    } finally {
      setClearingHistory(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1100px] px-6 pb-16 pt-6 sm:px-10">
        <h1 className="mb-8 text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>

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
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            className="rounded-2xl border border-border bg-card p-6"
          >

            {/* ── Account ───────────────────────────────────────────────── */}
            {activeSection === "account" && (
              <div>
                <SectionHeading>Account</SectionHeading>
                <SettingRow label="Username" hint="Your unique display name on Bankai">
                  <span className="text-sm text-muted-foreground">{currentUser}</span>
                </SettingRow>
                <SettingRow label="Stay signed in" hint="Keep your session after closing the browser">
                  <Toggle checked={remember} onChange={setRemember} />
                </SettingRow>
                <SettingRow label="Profile" hint="Edit avatar, banner and display info">
                  <Link href="/profile" className="flex items-center gap-1 text-sm font-medium text-primary">
                    Go to Profile <ChevronRight className="size-4" />
                  </Link>
                </SettingRow>

                <div className="mt-6 space-y-3 border-t border-border pt-6">
                  <button
                    onClick={() => { logout(); router.replace("/"); }}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/[0.08]">
                    <Trash2 className="size-4" />
                    Delete account
                    <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Appearance ────────────────────────────────────────────── */}
            {activeSection === "appearance" && (
              <div>
                <SectionHeading>Appearance</SectionHeading>

                {/* Theme */}
                <SettingRow label="Theme" hint="Choose your preferred appearance">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { value: "dark",    label: "Dark",    Icon: Moon    },
                      { value: "light",   label: "Light",   Icon: Sun     },
                      { value: "anilist", label: "AniList", Icon: null    },
                    ] as const).map(({ value, label, Icon }) => {
                      const active = resolvedTheme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all",
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:text-card-foreground hover:border-primary/30"
                          )}
                        >
                          {Icon ? (
                            <Icon className="size-4" />
                          ) : (
                            <span
                              className="inline-block size-4 shrink-0"
                              style={{
                                backgroundColor: "currentColor",
                                WebkitMaskImage: "url(/anilist-icon.svg)",
                                WebkitMaskSize: "contain",
                                WebkitMaskRepeat: "no-repeat",
                                WebkitMaskPosition: "center",
                                maskImage: "url(/anilist-icon.svg)",
                                maskSize: "contain",
                                maskRepeat: "no-repeat",
                                maskPosition: "center",
                              }}
                            />
                          )}
                          {label}
                          {active && <Check className="size-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </SettingRow>

                {/* Card animation */}
                <SettingRow label="Card animation" hint="How anime cards react when you hover over them">
                  <ChipGroup<CardAnimation>
                    value={cardAnimation}
                    onChange={setCardAnimation}
                    options={[
                      { value: "tilt",  label: "3D Tilt", icon: Layers        },
                      { value: "hover", label: "Plain",   icon: MousePointer2 },
                      { value: "glow",  label: "Foil",    icon: Sparkles      },
                    ]}
                  />
                </SettingRow>

                {/* Watch history on home */}
                <SettingRow label="Watch history on home" hint="Show or hide the Continue Watching row on the home page">
                  <Toggle checked={showWatchHistory} onChange={setShowWatchHistory} />
                </SettingRow>

                {/* Card layout */}
                <SettingRow label="Card layout" hint="How anime cards are displayed in rows">
                  <ChipGroup<CardLayout>
                    value={cardLayout}
                    onChange={setCardLayout}
                    options={[
                      { value: "default",  label: "Default"  },
                      { value: "anichart", label: "Anichart" },
                      { value: "row",      label: "Row List" },
                    ]}
                  />
                </SettingRow>

                {/* Card size */}
                <SettingRow label="Card size" hint="Size of anime cards in browse rows">
                  <ChipGroup<CardSize>
                    value={cardSize}
                    onChange={setCardSize}
                    options={[
                      { value: "small",  label: "Small"  },
                      { value: "medium", label: "Medium" },
                      { value: "large",  label: "Large"  },
                    ]}
                  />
                </SettingRow>

                {/* Episode list layout */}
                <SettingRow label="Episode list layout" hint="Default view for the episode list on the watch page">
                  <ChipGroup<EpisodeLayout>
                    value={episodeLayout}
                    onChange={setEpisodeLayout}
                    options={[
                      { value: "list",  label: "List"       },
                      { value: "grid",  label: "Grid"       },
                      { value: "image", label: "Image List" },
                    ]}
                  />
                </SettingRow>
              </div>
            )}

            {/* ── Language ──────────────────────────────────────────────── */}
            {activeSection === "language" && (
              <div>
                <SectionHeading>Language &amp; Titles</SectionHeading>
                <div className="space-y-2">
                  {TITLE_LANGUAGES.map(({ value, label, hint }) => (
                    <button
                      key={value}
                      onClick={() => setTitleLanguage(value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all",
                        titleLanguage === value
                          ? "border-primary/50 bg-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-accent"
                      )}
                    >
                      <div>
                        <p className={cn("text-sm font-semibold", titleLanguage === value ? "text-primary" : "text-card-foreground")}>
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
                      </div>
                      {titleLanguage === value && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Media ─────────────────────────────────────────────────── */}
            {activeSection === "media" && (
              <div>
                <SectionHeading>Media</SectionHeading>

                {/* Default provider */}
                <SettingRow label="Default Provider" hint="Which streaming provider to prefer. Auto lets Bankai pick the best available source.">
                  <SelectMenu
                    value={defaultProvider}
                    onChange={setDefaultProvider}
                    maxHeight={280}
                    options={[
                      { value: "auto", label: "Auto (Recommended)" },
                      { value: "_h", label: "Providers", isHeader: true },
                      ...Object.entries(PROVIDER_LABELS).map(([key, label]) => ({ value: key, label })),
                    ]}
                  />
                </SettingRow>

                {/* Default audio */}
                <div className="mb-6">
                  <SubHeading>Default Audio</SubHeading>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Applied when you open a watch page. Falls back to sub if the anime has no dub.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["sub", "dub"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setDefaultAudio(a)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all",
                          defaultAudio === a
                            ? "border-primary/50 bg-primary/10"
                            : "border-border hover:border-primary/30 hover:bg-accent"
                        )}
                      >
                        <div>
                          <p className={cn("text-sm font-semibold", defaultAudio === a ? "text-primary" : "text-card-foreground")}>
                            {a === "sub" ? "Sub" : "Dub"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {a === "sub" ? "Original with subtitles" : "English audio track"}
                          </p>
                        </div>
                        {defaultAudio === a && <Check className="size-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Playback toggles */}
                <div className="mt-2 border-t border-border pt-4">
                  <SubHeading>Playback</SubHeading>
                  <SettingRow label="Auto Play" hint="Start playing the episode automatically when the page loads">
                    <Toggle checked={autoPlay} onChange={setAutoPlay} />
                  </SettingRow>
                  <SettingRow label="Auto Skip Intro / Outro" hint="Automatically skip opening and ending sequences">
                    <Toggle checked={autoSkipIntroOutro} onChange={setAutoSkipIntroOutro} />
                  </SettingRow>
                  <SettingRow label="Auto Next Episode" hint="Automatically move to the next episode when one ends">
                    <Toggle checked={autoNextEpisode} onChange={setAutoNextEpisode} />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ── Notifications ─────────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <div>
                <SectionHeading>Notifications</SectionHeading>
                <SettingRow label="New episode alerts" hint="Notify when a new episode drops for anime in your Watching list">
                  <Toggle checked={notifNewEp} onChange={setNotifNewEp} />
                </SettingRow>
                <SettingRow label="Trending highlights" hint="Weekly digest of what's popular this season">
                  <Toggle checked={notifTrending} onChange={setNotifTrending} />
                </SettingRow>
                <p className="mt-6 text-xs text-muted-foreground">
                  Push notifications require a supported browser and your permission. Actual delivery is coming in a future update.
                </p>
              </div>
            )}

            {/* ── Comments ──────────────────────────────────────────────── */}
            {activeSection === "comments" && (
              <div>
                <SectionHeading>Comments</SectionHeading>
                <SettingRow
                  label="Show community comments"
                  hint="Display the community comment section on anime watch pages. Turn off to hide all comments."
                >
                  <Toggle checked={showComments} onChange={setShowComments} />
                </SettingRow>
                <p className="mt-6 text-xs text-muted-foreground">
                  Your own comments and reviews are not deleted when this is off — they are simply hidden from your view.
                </p>
              </div>
            )}

            {/* ── Privacy & Data ────────────────────────────────────────── */}
            {activeSection === "privacy" && (
              <div>
                <SectionHeading>Privacy &amp; Data</SectionHeading>
                <SettingRow label="Clear watch history" hint="Remove all history entries — this cannot be undone">
                  <button
                    onClick={handleClearHistory}
                    disabled={clearingHistory}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      clearDone
                        ? "border-emerald-500/40 text-emerald-500"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-card-foreground"
                    )}
                  >
                    {clearingHistory ? "Clearing…" : clearDone ? "Cleared ✓" : "Clear History"}
                  </button>
                </SettingRow>
                <SettingRow label="Export my data" hint="Download a JSON copy of your list, history, reviews, and comments">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-card-foreground disabled:opacity-50"
                  >
                    <Download className="size-3.5" />
                    {exporting ? "Exporting…" : "Export"}
                  </button>
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
