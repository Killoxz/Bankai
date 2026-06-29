import { cn } from "@/lib/utils";

/** Consistent page width + padding for all routes. */
export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-6 sm:py-6", className)}>
      {children}
    </div>
  );
}
