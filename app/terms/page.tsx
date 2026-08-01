import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = { title: "Terms & Privacy — Bankai" };

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What Bankai is",
    body: [
      "Bankai is a personal anime-tracking project: create an account, keep a watchlist, leave reviews, and comment on titles. Anime metadata (titles, covers, banners, descriptions, genres) is pulled live from AniList's public API — we don't host, store, or stream any video ourselves.",
    ],
  },
  {
    heading: "Account data we collect",
    body: [
      "Just a username and a password. Passwords are hashed before they ever touch the database — nobody, including us, can see your actual password.",
      "If you add a custom profile picture or banner, that image file is stored with our hosting provider (Vercel Blob) and the resulting link is saved to your account.",
    ],
  },
  {
    heading: "What you add yourself",
    body: [
      "Your watchlist entries, reviews, and comments are tied to your account and visible as part of using the site. You're responsible for what you post — don't upload anything you don't have the right to use, and don't post anything abusive or illegal.",
    ],
  },
  {
    heading: "Local storage & staying signed in",
    body: [
      "If you check \"Keep me Logged In,\" your username is cached in your browser's local storage so you don't have to log in on every visit. Unchecking it (or logging out) clears that cache. We don't use tracking cookies or third-party analytics.",
    ],
  },
  {
    heading: "What we don't do",
    body: [
      "We don't sell your data, and we don't share it with advertisers. There's no ad network on this site. Account data is used only to run the features you're actually using — your list, your reviews, your profile.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "This is a small, actively-developed project, so this page may change as features change. Nothing here is intended as formal legal advice — if that matters to you, treat it as a plain-language description of how the site actually works.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-6 sm:px-10">
        <h1 className="text-3xl font-bold text-foreground">Terms &amp; Privacy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/40">Last updated 2026-07-29.</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-lg font-semibold text-foreground">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/60">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
