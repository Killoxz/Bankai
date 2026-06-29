"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, Film, Trophy, Heart, Bookmark, Settings,
  LogOut, Star, Upload, Pencil, Check, X, Key, ImageIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimeCard } from "@/components/anime/anime-card";
import { useHistoryStore } from "@/store/history-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useAuthStore } from "@/store/auth-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatNumber, cn } from "@/lib/utils";
import type { AnimeCard as TAnimeCard } from "@/types/anime";
import Link from "next/link";

// Preset avatars from DiceBear — anime-friendly illustration style
const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/lorelei/svg?seed=sakura&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=yuki&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=hana&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=ryu&backgroundColor=d1f4e0",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=kira&backgroundColor=ffdbb4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=hikari&backgroundColor=b6d8f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=anzu&backgroundColor=ffcff0",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=mikoto&backgroundColor=ffecc8",
];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileView() {
  const mounted = useMounted();
  const router = useRouter();
  const { currentUser, logout, updateProfile } = useAuthStore();
  const history = useHistoryStore((s) => s.entries);
  const favorites = useWatchlistStore((s) => s.favorites);
  const entries = useWatchlistStore((s) => s.entries);

  const fileRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const lastChanged = currentUser?.usernameLastChanged ?? null;
  const elapsed = lastChanged ? Date.now() - lastChanged : Infinity;
  const canChangeUsername = elapsed >= USERNAME_COOLDOWN_MS;
  const cooldownLeft = canChangeUsername ? 0 : USERNAME_COOLDOWN_MS - elapsed;
  const cooldownDays = Math.ceil(cooldownLeft / (24 * 60 * 60 * 1000));

  const stats = useMemo(() => {
    const episodes = history.length;
    const seconds = history.reduce((acc, e) => acc + e.progress, 0);
    const hours = Math.round(seconds / 3600);
    const completed = entries.filter((e) => e.status === "COMPLETED").length;
    return { episodes, hours, completed, favorites: favorites.length };
  }, [history, entries, favorites]);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    try {
      const compressed = await compressImage(file);
      updateProfile({ avatar: compressed });
      setShowAvatarPicker(false);
    } catch {
      setAvatarError("Could not read image. Try another file.");
    }
    e.target.value = "";
  };

  const selectPreset = (url: string) => {
    updateProfile({ avatar: url });
    setShowAvatarPicker(false);
  };

  const saveUsername = () => {
    setNameError("");
    const un = nameInput.trim();
    if (un.length < 2) { setNameError("Must be at least 2 characters."); return; }
    if (un.length > 20) { setNameError("Must be 20 characters or less."); return; }
    updateProfile({ username: un });
    setEditingName(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!mounted) return null;

  if (!currentUser) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div className="space-y-4">
          <p className="text-lg font-semibold">You&apos;re not signed in</p>
          <p className="text-sm text-muted-foreground">Create an account or sign in to view your profile.</p>
          <div className="flex justify-center gap-3">
            <Link href="/login" className={buttonVariants()}>Sign in</Link>
            <Link href="/signup" className={buttonVariants({ variant: "glass" })}>Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  const joinDate = new Date(currentUser.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const achievements = [
    { icon: Film, label: "First Watch", unlocked: stats.episodes > 0 },
    { icon: Clock, label: "10 Hours In", unlocked: stats.hours >= 10 },
    { icon: Trophy, label: "Completionist", unlocked: stats.completed >= 5 },
    { icon: Heart, label: "Curator", unlocked: stats.favorites >= 10 },
  ];

  return (
    <div>
      {/* Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/30 via-fuchsia-500/20 to-sky-500/20 sm:h-56">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto -mt-16 w-full max-w-[1600px] px-3 sm:px-6">
        {/* Avatar + name row */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          {/* Avatar with picker */}
          <div className="relative shrink-0">
            <Avatar
              src={currentUser.avatar}
              fallback={currentUser.username}
              size={112}
              className="border-4 border-background shadow-xl"
            />
            <button
              onClick={() => setShowAvatarPicker((v) => !v)}
              aria-label="Change profile picture"
              className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <ImageIcon className="size-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarPick}
            />

            {/* Avatar picker panel */}
            {showAvatarPicker && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 rounded-xl border border-border bg-card p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Choose avatar</p>
                  <button
                    onClick={() => setShowAvatarPicker(false)}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Presets grid */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => selectPreset(url)}
                      className={cn(
                        "overflow-hidden rounded-full border-2 transition-all hover:scale-105",
                        currentUser.avatar === url
                          ? "border-primary shadow-lg shadow-primary/30"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Avatar option ${i + 1}`} className="size-14 object-cover" />
                    </button>
                  ))}
                </div>

                {/* Upload button */}
                <div className="mt-3 border-t border-border pt-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Upload className="size-4" />
                    Upload your own photo
                  </button>
                  {avatarError && <p className="mt-1.5 text-xs text-destructive">{avatarError}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Name + email */}
          <div className="min-w-0 flex-1 pb-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditingName(false); }}
                  className="h-8 max-w-[200px] text-lg font-bold"
                  autoFocus
                />
                <button onClick={saveUsername} className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90">
                  <Check className="size-3.5" />
                </button>
                <button onClick={() => setEditingName(false)} className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground">
                  <X className="size-3.5" />
                </button>
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold leading-tight">
                  {currentUser.username || "Anonymous"}
                </h1>
                {canChangeUsername ? (
                  <button
                    onClick={() => { setNameInput(currentUser.username); setEditingName(true); setNameError(""); }}
                    aria-label="Edit username"
                    className="shrink-0 grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                ) : (
                  <span
                    title={`Username can be changed again in ${cooldownDays} day${cooldownDays !== 1 ? "s" : ""}`}
                    className="shrink-0 flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground cursor-default"
                  >
                    <Key className="size-3" /> {cooldownDays}d
                  </span>
                )}
              </div>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">{currentUser.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Member since {joinDate}</p>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <Link href="/settings" className={buttonVariants({ variant: "glass", size: "sm" })}>
              <Settings className="size-4" /> Settings
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Clock className="size-5" />} label="Hours watched" value={String(stats.hours)} />
          <StatCard icon={<Film className="size-5" />} label="Episodes" value={formatNumber(stats.episodes)} />
          <StatCard icon={<Star className="size-5" />} label="Completed" value={String(stats.completed)} />
          <StatCard icon={<Heart className="size-5" />} label="Favorites" value={String(stats.favorites)} />
        </div>

        <div className="mt-8">
          <Tabs defaultValue="continue" className="space-y-5">
            <TabsList>
              <TabsTrigger value="continue">Continue Watching</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="bookmarks">Watchlist</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="continue">
              {history.length > 0
                ? <Grid items={history.map((h) => h.anime)} />
                : <Empty text="Nothing in progress yet." />}
            </TabsContent>

            <TabsContent value="favorites">
              {favorites.length > 0
                ? <Grid items={favorites} />
                : <Empty text="No favorites yet. Tap the heart on any anime." />}
            </TabsContent>

            <TabsContent value="bookmarks">
              {entries.length > 0
                ? <Grid items={entries.map((e) => e.anime)} />
                : <Empty text="Your watchlist is empty." />}
            </TabsContent>

            <TabsContent value="achievements">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {achievements.map((a) => (
                  <div
                    key={a.label}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-5 text-center ${
                      a.unlocked
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-card opacity-60"
                    }`}
                  >
                    <a.icon className={`size-8 ${a.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{a.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-primary">{icon}</div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Grid({ items }: { items: TAnimeCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((a, i) => <AnimeCard key={a.id} anime={a} index={i} />)}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <Bookmark className="size-8" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
