import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { PWARegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bankai — Watch Anime Online",
    template: "%s · Bankai",
  },
  description:
    "Bankai is a modern anime streaming platform. Browse trending shows, track your watchlist, and pick up where you left off.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bankai",
  },
  icons: {
    icon: [
      { url: "/bankai-icon-512.png", type: "image/png" },
      { url: "/bankai-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/bankai-icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#13141a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Restore saved accent color + border radius before paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var a = JSON.parse(localStorage.getItem('bankai-accent') || 'null');
            if (a) {
              document.documentElement.style.setProperty('--primary', a.hsl);
              document.documentElement.style.setProperty('--primary-foreground', a.fg);
              document.documentElement.style.setProperty('--ring', a.hsl);
            }
            var r = localStorage.getItem('bankai-radius');
            if (r) {
              var rem = (Number(r) / 100) * 1.2;
              document.documentElement.style.setProperty('--radius', rem.toFixed(2) + 'rem');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
