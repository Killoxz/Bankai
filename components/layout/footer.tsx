import Link from "next/link";
import Image from "next/image";
import { Send, MessageCircle, Youtube, Instagram } from "lucide-react";
import pkg from "../../package.json";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Status", href: "/status" },
  { label: "Contact", href: "/contact" },
];

const SOCIAL = [
  { icon: Send, href: "#", label: "Telegram" },
  { icon: MessageCircle, href: "#", label: "Discord" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Instagram, href: "#", label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-white/10 px-8 py-6 sm:px-12">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Image src="/bankai-logo.svg" alt="Bankai" width={70} height={22} className="h-5 w-auto opacity-90 invert dark:invert-0" />
            <span className="text-[10px] font-medium text-gray-400 dark:text-white/30">v{pkg.version}</span>
          </div>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-gray-500 dark:text-white/50 transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {SOCIAL.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="grid size-8 place-items-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-black"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
