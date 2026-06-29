"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  X, Palette, Languages, PlayCircle, MessageSquare,
  Wrench, AppWindow, ChevronRight, Trash2, UserCircle,
  Check, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePlayerStore, type PlayerSettings } from "@/store/player-store";
import { useHistoryStore } from "@/store/history-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useAuthStore } from "@/store/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "account",          label: "Account",          icon: UserCircle },
  { id: "appearance",       label: "Appearance",       icon: Palette },
  { id: "app-behavior",     label: "App Behavior",     icon: AppWindow },
  { id: "display-language", label: "Display Language", icon: Languages },
  { id: "media-settings",   label: "Media Settings",   icon: PlayCircle },
  { id: "comments",         label: "Comments",         icon: MessageSquare },
  { id: "other-settings",   label: "Other Settings",   icon: Wrench },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const ACCENT_PRESETS = [
  { label: "Bankai",          value: "45 88% 60%",  fg: "220 20% 10%", hex: "#F5C435" },
  { label: "AniList",         value: "198 96% 50%", fg: "0 0% 100%",   hex: "#02A9FF" },
  { label: "MediumSlateBlue", value: "249 80% 67%", fg: "0 0% 100%",   hex: "#7B68EE" },
];

function hexToHsl(hex: string): { hsl: string; fg: string } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return {
    hsl: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
    fg: l > 0.55 ? "220 20% 10%" : "0 0% 100%",
  };
}

const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function applyAccent(hsl: string, fg: string) {
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--primary-foreground", fg);
  document.documentElement.style.setProperty("--ring", hsl);
  localStorage.setItem("bankai-accent", JSON.stringify({ hsl, fg }));
}

function applyRadius(pct: number) {
  const rem = (pct / 100) * 1.2;
  document.documentElement.style.setProperty("--radius", `${rem.toFixed(2)}rem`);
  localStorage.setItem("bankai-radius", String(pct));
}

function formatCooldown(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default function SettingsPage() {
  const router = useRouter();
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const player = usePlayerStore();
  const clearHistory = useHistoryStore((s) => s.clear);

  const [active, setActive] = useState<SectionId>("account");
  const [accentHsl, setAccentHsl] = useState("45 88% 60%");
  const [customHex, setCustomHex] = useState("#7B68EE");
  const [radius, setRadius] = useState(40);

  useEffect(() => {
    const saved = localStorage.getItem("bankai-accent");
    if (saved) {
      try { const { hsl } = JSON.parse(saved); setAccentHsl(hsl); } catch {}
    }
    const savedR = localStorage.getItem("bankai-radius");
    if (savedR) setRadius(Number(savedR));
  }, []);

  const selectAccent = (hsl: string, fg: string) => {
    setAccentHsl(hsl);
    applyAccent(hsl, fg);
  };

  const handleRadius = (v: number) => {
    setRadius(v);
    applyRadius(v);
  };

  const wipeEverything = () => {
    clearHistory();
    useWatchlistStore.setState({ entries: [], favorites: [] });
    ["bankai-history", "bankai-watchlist", "bankai-player", "bankai-ui"].forEach(
      (k) => localStorage.removeItem(k)
    );
  };

  const activeSection = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-md">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" style={{ maxHeight: "90vh" }}>

        {/* Left sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-border py-2">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Settings</p>
            <p className="text-sm font-semibold">{activeSection.label}</p>
          </div>
          <div className="mx-4 mb-3 h-px bg-border" />
          <nav className="flex-1 space-y-0.5 px-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  active === id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
                {active === id && <ChevronRight className="ml-auto size-3.5 opacity-60" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Settings</p>
              <h1 className="text-base font-semibold uppercase tracking-wider text-foreground/80">
                {activeSection.label}
              </h1>
            </div>
            <button
              onClick={() => router.back()}
              className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close settings"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {active === "account"          && <AccountSection mounted={mounted} />}
            {active === "appearance"       && (
              <AppearanceSection
                mounted={mounted} theme={theme} setTheme={setTheme}
                accentHsl={accentHsl} onAccent={selectAccent}
                radius={radius} onRadius={handleRadius} player={player}
                customHex={customHex} setCustomHex={setCustomHex}
              />
            )}
            {active === "app-behavior"     && <AppBehaviorSection />}
            {active === "display-language" && <DisplayLanguageSection player={player} />}
            {active === "media-settings"   && <MediaSettingsSection player={player} />}
            {active === "comments"         && <CommentsSection player={player} />}
            {active === "other-settings"   && <OtherSettingsSection onWipe={wipeEverything} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Account ────────────────────────────── */
function AccountSection({ mounted }: { mounted: boolean }) {
  const { currentUser, updateProfile } = useAuthStore();
  const router = useRouter();
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!mounted || !currentUser) {
    return (
      <InfoRow>
        <span className="text-muted-foreground">
          {mounted ? "Sign in to manage your account. " : ""}
          {mounted && (
            <button onClick={() => router.push("/login")} className="text-primary underline">
              Sign in
            </button>
          )}
        </span>
      </InfoRow>
    );
  }

  const lastChanged = currentUser.usernameLastChanged ?? null;
  const elapsed = lastChanged ? Date.now() - lastChanged : Infinity;
  const canChange = elapsed >= USERNAME_COOLDOWN_MS;
  const cooldownLeft = canChange ? 0 : USERNAME_COOLDOWN_MS - elapsed;

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    const un = newUsername.trim();
    if (!un) { setError("Username cannot be empty."); return; }
    if (un.length < 2) { setError("Must be at least 2 characters."); return; }
    if (un.length > 20) { setError("Must be 20 characters or less."); return; }
    if (un.toLowerCase() === (currentUser.username ?? "").toLowerCase()) {
      setError("That's already your username."); return;
    }
    try {
      const res = await fetch("/api/auth/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, username: un }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update username."); return; }
    } catch {
      setError("Network error. Please try again.");
      return;
    }
    updateProfile({ username: un });
    setNewUsername("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <>
      <Row label="Email" hint="Your account email address.">
        <span className="text-sm text-muted-foreground">{currentUser.email}</span>
      </Row>

      <Row label="Username" hint={
        canChange
          ? "Pick a new username. You can change it again after 7 days."
          : `Next change available in ${formatCooldown(cooldownLeft)}.`
      }>
        {canChange ? (
          <div className="flex items-center gap-2">
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder={currentUser.username ?? ""}
              className="h-8 w-36 text-sm"
              maxLength={20}
            />
            <Button size="sm" onClick={handleSave} className="h-8 gap-1.5">
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{currentUser.username}</span>
            <span className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="size-3" /> {formatCooldown(cooldownLeft)}
            </span>
          </div>
        )}
      </Row>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">
          Username updated to <strong>{currentUser.username}</strong>!
        </div>
      )}

      <Row label="Member since" hint="When your account was created.">
        <span className="text-sm text-muted-foreground">
          {new Date(currentUser.createdAt).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </span>
      </Row>
    </>
  );
}

/* ─── Section: Appearance ─────────────────────────── */
function AppearanceSection({ mounted, theme, setTheme, accentHsl, onAccent, radius, onRadius, player, customHex, setCustomHex }: {
  mounted: boolean; theme?: string; setTheme: (t: string) => void;
  accentHsl: string; onAccent: (hsl: string, fg: string) => void;
  radius: number; onRadius: (v: number) => void;
  player: PlayerSettings;
  customHex: string; setCustomHex: (hex: string) => void;
}) {
  return (
    <>
      <Row label="Theme" hint="Choose your preferred color scheme.">
        <Select
          value={mounted ? theme ?? "dark" : "dark"}
          onChange={(e) => setTheme(e.target.value)}
          options={[
            { label: "Dark",   value: "dark"   },
            { label: "Light",  value: "light"  },
            { label: "System", value: "system" },
          ]}
        />
      </Row>

      <Row label="Primary Accent Color" hint="Select the primary accent color for the UI. Note: * Colors are randomly generated.">
        {(() => {
          const matched = ACCENT_PRESETS.find((p) => p.value === accentHsl);
          const selectedLabel = matched?.label ?? "Custom";
          const previewHex = matched?.hex ?? customHex;

          const handleSelect = (label: string) => {
            if (label === "Custom") return;
            const p = ACCENT_PRESETS.find((x) => x.label === label)!;
            onAccent(p.value, p.fg);
          };
          const handleCustom = (hex: string) => {
            setCustomHex(hex);
            const { hsl, fg } = hexToHsl(hex);
            onAccent(hsl, fg);
          };

          return (
            <div className="flex w-52 flex-col gap-2">
              <Select
                value={selectedLabel}
                onChange={(e) => handleSelect(e.target.value)}
                options={[
                  ...ACCENT_PRESETS.map((p) => ({ label: p.label, value: p.label })),
                  { label: "Custom", value: "Custom" },
                ]}
              />
              <div
                className="h-8 w-full rounded-md border border-border/40"
                style={{ background: previewHex }}
              />
              {selectedLabel === "Custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => handleCustom(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="text-xs text-muted-foreground">{customHex}</span>
                </div>
              )}
            </div>
          );
        })()}
      </Row>

      <Row label="Border Radius" hint="Set the global corner radius for UI elements.">
        <div className="flex items-center gap-3 w-48">
          <input
            type="range" min={0} max={100} value={radius}
            onChange={(e) => onRadius(Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{radius}%</span>
        </div>
      </Row>

      <Row label="Episode List Layout" hint="Default layout for episode lists on the watch page.">
        <SegmentedControl
          value={player.episodeLayout ?? "list"}
          onChange={(v) => player.setSettings({ episodeLayout: v as "grid" | "list" })}
          options={[{ label: "Grid", value: "grid" }, { label: "List", value: "list" }]}
        />
      </Row>

      <Row label="Watch History" hint="Show or hide the Continue Watching section on the home page.">
        <SegmentedControl
          value={player.showHistory ?? "show"}
          onChange={(v) => player.setSettings({ showHistory: v as "show" | "hide" })}
          options={[{ label: "Hide", value: "hide" }, { label: "Show", value: "show" }]}
        />
      </Row>

      <Row label="Home Layout" hint="Controls how the home page is structured.">
        <div className="flex gap-2">
          {([
            { value: "classic",   label: "Default",   desc: "Sidebar layout" },
            { value: "compact",   label: "Compact",   desc: "Rows only"     },
            { value: "spotlight", label: "Spotlight", desc: "Big hero"       },
            { value: "default",   label: "Classic",   desc: "Hero + rows"   },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => player.setSettings({ homeLayout: opt.value })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs transition-all w-20",
                (player.homeLayout ?? "classic") === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {/* Mini layout preview */}
              <div className="w-full space-y-1 rounded-md border border-current/20 bg-muted/50 p-1.5">
                {opt.value === "default" && (
                  <>
                    <div className="h-3 w-full rounded bg-current opacity-30" />
                    <div className="h-1.5 w-3/4 rounded bg-current opacity-20" />
                    <div className="h-1.5 w-full rounded bg-current opacity-20" />
                  </>
                )}
                {opt.value === "compact" && (
                  <>
                    <div className="h-1.5 w-full rounded bg-current opacity-20" />
                    <div className="h-1.5 w-full rounded bg-current opacity-20" />
                    <div className="h-1.5 w-full rounded bg-current opacity-20" />
                    <div className="h-1.5 w-3/4 rounded bg-current opacity-20" />
                  </>
                )}
                {opt.value === "spotlight" && (
                  <>
                    <div className="h-5 w-full rounded bg-current opacity-30" />
                    <div className="h-1.5 w-full rounded bg-current opacity-20" />
                  </>
                )}
                {opt.value === "classic" && (
                  <div className="flex gap-1">
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-full rounded bg-current opacity-30" />
                      <div className="h-1 w-full rounded bg-current opacity-20" />
                      <div className="h-1 w-full rounded bg-current opacity-20" />
                    </div>
                    <div className="w-2.5 space-y-1">
                      <div className="h-1 w-full rounded bg-current opacity-20" />
                      <div className="h-1 w-full rounded bg-current opacity-20" />
                      <div className="h-1 w-full rounded bg-current opacity-20" />
                    </div>
                  </div>
                )}
              </div>
              <span className="font-medium">{opt.label}</span>
              <span className="text-[10px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </Row>

      <Row label="Card Layout" hint="Layout for anime cards on the Home and Search pages.">
        <SegmentedControl
          value={player.cardLayout ?? "classic"}
          onChange={(v) => player.setSettings({ cardLayout: v as "classic" | "anichart" | "rowlist" })}
          options={[
            { label: "Classic",  value: "classic"  },
            { label: "AniChart", value: "anichart" },
            { label: "Row List", value: "rowlist"  },
          ]}
        />
      </Row>

      <Row label="Card Size" hint="Display size for anime cards.">
        <SegmentedControl
          value={player.cardSize ?? "medium"}
          onChange={(v) => player.setSettings({ cardSize: v as "medium" | "large" })}
          options={[{ label: "Medium", value: "medium" }, { label: "Large", value: "large" }]}
        />
      </Row>
    </>
  );
}

/* ─── Section: App Behavior ───────────────────────── */
function AppBehaviorSection() {
  return (
    <>
      <Row label="Default Landing Page" hint="Page that opens when you visit Bankai.">
        <Select
          value="home" onChange={() => {}}
          options={[
            { label: "Home",              value: "home"    },
            { label: "Trending",          value: "trending"},
            { label: "Continue Watching", value: "history" },
          ]}
        />
      </Row>
      <InfoRow>Keyboard shortcuts and navigation preferences will appear here.</InfoRow>
    </>
  );
}

/* ─── Section: Display Language ───────────────────── */
function DisplayLanguageSection({ player }: { player: PlayerSettings }) {
  return (
    <>
      <Row label="Interface Language" hint="Language used for the Bankai interface.">
        <Select value="en" onChange={() => {}} options={[{ label: "English", value: "en" }]} />
      </Row>
      <Row label="Title Language" hint="How anime titles are displayed throughout the site.">
        <Select
          value={player.titleLanguage ?? "romaji"}
          onChange={(e) => player.setSettings({ titleLanguage: e.target.value as "romaji" | "english" | "native" })}
          options={[
            { label: "Romaji",  value: "romaji"  },
            { label: "English", value: "english" },
            { label: "Native",  value: "native"  },
          ]}
        />
      </Row>
    </>
  );
}

/* ─── Section: Media Settings ─────────────────────── */
function MediaSettingsSection({ player }: { player: PlayerSettings }) {
  return (
    <>
      <Row label="Default Audio" hint="Preferred audio type when opening an episode.">
        <Select
          value={player.category}
          onChange={(e) => player.setSettings({ category: e.target.value as "sub" | "dub" })}
          options={[{ label: "Subbed", value: "sub" }, { label: "Dubbed", value: "dub" }]}
        />
      </Row>
      <Toggle label="Autoplay"                  value={player.autoPlay}      onChange={(v) => player.setSettings({ autoPlay: v })} />
      <Toggle label="Auto play next episode"    value={player.autoNext}      onChange={(v) => player.setSettings({ autoNext: v })} />
      <Toggle label="Auto skip intro"           value={player.autoSkipIntro} onChange={(v) => player.setSettings({ autoSkipIntro: v })} />
      <Row label="Subtitle size" hint="Font size for subtitles during playback.">
        <Select
          value={String(player.subtitleSize)}
          onChange={(e) => player.setSettings({ subtitleSize: Number(e.target.value) })}
          options={[
            { label: "Small",  value: "16" },
            { label: "Medium", value: "20" },
            { label: "Large",  value: "26" },
          ]}
        />
      </Row>
    </>
  );
}

/* ─── Section: Comments ───────────────────────────── */
function CommentsSection({ player }: { player: PlayerSettings }) {
  return (
    <>
      <Toggle
        label="Show comments section"
        value={player.showComments}
        onChange={(v) => player.setSettings({ showComments: v })}
      />
      <InfoRow>Comments are shown at the bottom of the watch page when enabled.</InfoRow>
    </>
  );
}

/* ─── Section: Other Settings ─────────────────────── */
function OtherSettingsSection({ onWipe }: { onWipe: () => void }) {
  return (
    <Row label="Clear local data" hint="Removes history, watchlist, favorites, and preferences from this device.">
      <Button variant="destructive" size="sm" onClick={onWipe}>
        <Trash2 className="size-4" /> Clear everything
      </Button>
    </Row>
  );
}

/* ─── Shared sub-components ───────────────────────── */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl border border-border bg-card/60 px-4 py-3.5 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none",
          value
            ? "border-primary/50 bg-primary"
            : "border-border bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full shadow-md transition-transform duration-200",
            value
              ? "translate-x-[22px] bg-primary-foreground"
              : "translate-x-[2px] bg-muted-foreground"
          )}
        />
      </button>
    </Row>
  );
}

function SegmentedControl({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-all",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
