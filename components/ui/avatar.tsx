"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: number;
}

export function Avatar({
  src,
  alt = "",
  fallback,
  size = 40,
  className,
  ...props
}: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const initials = (fallback ?? alt ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-secondary-foreground",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
