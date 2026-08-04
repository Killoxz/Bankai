import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SettingsSync } from "@/components/layout/settings-sync";
import { Providers } from "@/components/layout/providers";
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
      { url: "/bankai-icon-512.png", sizes: "192x192", type: "image/png" },
      { url: "/bankai-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/bankai-icon-512.png", sizes: "180x180", type: "image/png" },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="apple-touch-icon" sizes="180x180" href="/bankai-icon-512.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/bankai-icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/bankai-icon-512.png" />
      </head>
      <body className={`${inter.variable} pb-24 font-sans md:pb-0`}>
        <Providers>
          <NextTopLoader color="var(--primary)" height={3} showSpinner={false} />
          <SettingsSync />
          {children}
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
