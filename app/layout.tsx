import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SettingsSync } from "@/components/layout/settings-sync";
import { Providers } from "@/components/layout/providers";
import { BetaBanner } from "@/components/layout/beta-banner";
import { SettingsModal } from "@/components/layout/settings-modal";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/layout/page-transition";
import { TvProvider } from "@/components/tv/tv-provider";
import { TvNav } from "@/components/tv/tv-nav";
import { TvModePrompt } from "@/components/tv/tv-mode-prompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bankai — Watch Anime Online",
  description: "Stream anime in HD — sub and dub.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/bankai-favicon.svg", type: "image/svg+xml" },
      { url: "/bankai-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/bankai-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/bankai-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Warm up connections for the two heaviest external origins */}
        <link rel="preconnect" href="https://s4.anilist.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://s4.anilist.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#13141a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bankai" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="512x512" href="/bankai-icon-512.png" />
        <link rel="icon" type="image/svg+xml" href="/bankai-favicon.svg" />
        <link rel="icon" type="image/png" sizes="512x512" href="/bankai-icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/bankai-icon-192.png" />
      </head>
      <body className={`${inter.variable} pb-24 font-sans lg:pb-0`}>
        <Providers>
          <TvProvider>
            <BetaBanner />
            <NextTopLoader color="var(--primary)" height={3} showSpinner={false} />
            <SettingsSync />
            <TvNav />
            <TvModePrompt />
            <Navbar />
            <div className="bankai-nav-spacer h-14 lg:h-16" aria-hidden="true" />
            <PageTransition>
              {children}
            </PageTransition>
            <SettingsModal />
            <MobileNav />
          </TvProvider>
        </Providers>
      </body>
    </html>
  );
}
