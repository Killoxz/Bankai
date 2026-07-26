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
  Crown,
  ChevronDown,
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
import { useNotifications } from "@/hooks/use-notifications";
import { usePathname } from "next/navigation";

const DESKTOP_NAV = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse", chevron: true },
  { label: "Schedule", href: "/schedule" },
];

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:px-6">

        {/* Mobile only: hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="shrink-0 lg:hidden"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo */}
        <Logo />

        {/* Desktop: nav links */}
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {DESKTOP_NAV.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {link.chevron && <ChevronDown className="size-3.5" />}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-0.5">

          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCommandOpen(true)}
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>

          {/* Watchlist */}
          <Link
            href="/watchlist"
            aria-label="Watchlist"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hidden sm:inline-flex"
            )}
          >
            <Bookmark className="size-5" />
          </Link>

          {/* Notifications */}
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
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent",
                        n.unread && "bg-primary/5"
                      )}
                    >
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

          {/* User avatar / account dropdown */}
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
            <Link href="/profile">
              <DropdownItem><User className="size-4" /> Profile</DropdownItem>
            </Link>
            <Link href="/watchlist">
              <DropdownItem><Bookmark className="size-4" /> Watchlist</DropdownItem>
            </Link>
            <Link href="/history">
              <DropdownItem><HistoryIcon className="size-4" /> History</DropdownItem>
            </Link>
            <Link href="/settings">
              <DropdownItem><Settings className="size-4" /> Settings</DropdownItem>
            </Link>
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

          {/* Premium CTA — desktop only */}
          <Link
            href="/settings"
            className="ml-2 hidden items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:inline-flex"
          >
            <Crown className="size-3.5" />
            Premium
          </Link>
        </div>
      </div>
    </header>
  );
}
