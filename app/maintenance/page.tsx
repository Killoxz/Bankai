import Image from "next/image";

export const metadata = {
  title: "Down for Maintenance · Bankai",
  robots: "noindex",
};

export default function MaintenancePage() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/Bankai Second Logo.svg"
          alt="Bankai"
          width={72}
          height={72}
          className="opacity-80"
        />
        <h1 className="text-2xl font-bold tracking-tight">Down for Maintenance</h1>
      </div>

      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Bankai is temporarily offline while we work on improving the streaming experience.
        Check back soon.
      </p>

      <div className="h-px w-24 bg-border" />

      <p className="text-xs text-muted-foreground/50">Bankai</p>
    </div>
  );
}
