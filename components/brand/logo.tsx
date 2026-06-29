import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("flex shrink-0 select-none items-center", className)}
      aria-label="Bankai home"
    >
      <Image
        src="/bankai-logo.svg"
        alt="Bankai"
        width={120}
        height={36}
        priority
        className={cn(
          "h-7 w-auto object-contain object-left sm:h-8",
          collapsed ? "max-w-[32px]" : "max-w-[80px] sm:max-w-[120px]"
        )}
      />
    </Link>
  );
}
