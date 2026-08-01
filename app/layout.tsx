import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} pb-24 font-sans md:pb-0`}>
        <Providers>
          <SettingsSync />
          {children}
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
