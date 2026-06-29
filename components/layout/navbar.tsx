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
import { useNotifications } from "@/hooks/use-notifications";

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const { notifications, unreadCount, markAllRead } = useNotifications();

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
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
                onClick={markAllRead}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            }
          >
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownLabel>Notifications</DropdownLabel>
              {notifications.length > 0 && (
                <span className="text-xs text-muted-foreground">{notifications.length} total</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Bell className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">
                    Add anime to your watchlist to get updates
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Link key={n.id} href={n.href}>
                    <div className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent",
                      n.unread && "bg-primary/5"
                    )}>
                      {n.coverImage && (
                        <img
                          src={n.coverImage}
                          alt=""
                          className="mt-0.5 size-9 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">{n.time}</p>
                      </div>
                      {n.unread && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  </Link>
                ))
              )}
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

