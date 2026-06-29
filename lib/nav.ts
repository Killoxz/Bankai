import type { LucideIcon } from "lucide-react";
import {
  Home,
  Flame,
  CalendarDays,
  Compass,
  Bookmark,
  History,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Home", href: "/", icon: Home },
      { label: "Trending", href: "/trending", icon: Flame },
      { label: "Browse", href: "/browse", icon: Compass },
      { label: "Schedule", href: "/schedule", icon: CalendarDays },
    ],
  },
  {
    heading: "Library",
    items: [
      { label: "Watchlist", href: "/watchlist", icon: Bookmark },
      { label: "History", href: "/history", icon: History },
    ],
  },
];

export const TOP_NAV: NavItem[] = [
  { label: "Trending", href: "/trending", icon: Flame },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "History", href: "/history", icon: History },
];

export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Trending", href: "/trending", icon: Flame },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Watchlist", href: "/watchlist", icon: Bookmark },
  { label: "History", href: "/history", icon: History },
];
