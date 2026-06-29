"use client";

import Link from "next/link";
import {
  Search,
  Bell,
  Settings,
  Menu,
  User,
  LogIn,
  LogOut,
  Bookmark,
  History as HistoryIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { InstallPWAButton } from "@/components/install-pwa-button";

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border glass">
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:gap-4 sm:px-6">

        {/* Left: hamburger + logo */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <Logo />
        </div>

        {/* Search bar — grows to fill space */}
        <button
          onClick={() => setCommandOpen(true)}
          className="mx-auto flex h-10 w-full max-w-xl flex-1 items-center gap-2 rounded-[var(--radius)] border border-input bg-background/40 px-4 text-sm text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open search"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">Search anime…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] sm:inline">
            ⌘
          </kbd>
        </button>

        {/* Right: install + notifications + settings + profile */}
        <div className="flex shrink-0 items-center gap-0.5">
          <InstallPWAButton />
          <Dropdown
            trigger={
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-5" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              </Button>
            }
          >
            <DropdownLabel>Notifications</DropdownLabel>
            <div className="max-h-72 overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex flex-col gap-0.5 rounded-lg px-3 py-2 hover:bg-accent">
                  <span className="text-sm">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                </div>
              ))}
            </div>
          </Dropdown>

          <Link href="/settings" aria-label="Settings" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden sm:inline-flex")}>
            <Settings className="size-5" />
          </Link>

          <Dropdown
            trigger={
              <button
                className="ml-0.5 rounded-full ring-2 ring-transparent transition hover:ring-primary/40"
                aria-label="Account menu"
              >
                <Avatar
                  src={currentUser?.avatar}
                  fallback={currentUser?.username ?? "G"}
                  size={34}
                />
              </button>
            }
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar src={currentUser?.avatar} fallback={currentUser?.username ?? "G"} size={38} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {currentUser?.username ?? "Guest"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser?.email ?? "Not signed in"}
                </p>
              </div>
            </div>
            <DropdownSeparator />
            <Link href="/profile"><DropdownItem><User className="size-4" /> Profile</DropdownItem></Link>
            <Link href="/watchlist"><DropdownItem><Bookmark className="size-4" /> Watchlist</DropdownItem></Link>
            <Link href="/history"><DropdownItem><HistoryIcon className="size-4" /> History</DropdownItem></Link>
            <Link href="/settings"><DropdownItem><Settings className="size-4" /> Settings</DropdownItem></Link>
            <DropdownSeparator />
            {currentUser ? (
              <DropdownItem onClick={logout} className="text-destructive">
                <LogOut className="size-4" /> Sign out
              </DropdownItem>
            ) : (
              <Link href="/login">
                <DropdownItem className="text-primary"><LogIn className="size-4" /> Sign in</DropdownItem>
              </Link>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

const NOTIFICATIONS = [
  { id: 1, title: "Episode 9 of Zero Division is now available", time: "12m ago" },
  { id: 2, title: "Hollow Crown Saga added to Trending", time: "1h ago" },
  { id: 3, title: "Your watchlist has 3 new episodes", time: "Yesterday" },
];
