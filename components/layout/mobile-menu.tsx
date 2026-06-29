"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { SIDEBAR_SECTIONS } from "@/lib/nav";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function MobileMenu() {
  const open = useUIStore((s) => s.mobileMenuOpen);
  const setOpen = useUIStore((s) => s.setMobileMenu);
  const pathname = usePathname();

  return (
    <Sheet open={open} onClose={() => setOpen(false)} side="left">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {SIDEBAR_SECTIONS.map((section, si) => (
            <div key={si} className="mb-3">
              {section.heading && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.heading}
                </p>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href.split("?")[0]);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
