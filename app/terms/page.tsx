import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = { title: "Terms & Privacy — Bankai" };

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "About Bankai",
    body: [
      "Bankai is a free anime streaming and tracking platform. You can browse titles, build a personal watchlist, track watch history, write reviews, and interact with a community of fans. Video streams are sourced through third-party providers — Bankai itself does not host, own, or distribute any video content.",
      "Anime metadata including titles, cover art, banners, descriptions, and genre tags is fetched from AniList's public GraphQL API under their terms of use.",
    ],
  },
  {
    heading: "Acceptance of Terms",
    body: [
      "By accessing or using Bankai you agree to these terms. If you do not agree, please discontinue use of the platform. We reserve the right to update these terms at any time; continued use after a change constitutes acceptance of the revised terms.",
    ],
  },
  {
    heading: "Account Registration",
    body: [
      "Creating an account requires a username and password. You are responsible for keeping your credentials secure and for all activity that occurs under your account. Do not share your password with anyone.",
      "You must be at least 13 years old to create an account. By registering you confirm you meet this requirement.",
      "Passwords are hashed using bcrypt before being stored — neither Bankai staff nor the database can retrieve your plaintext password.",
    ],
  },
  {
    heading: "User Content",
    body: [
      "You retain ownership of any reviews or comments you post on Bankai. By submitting content you grant Bankai a non-exclusive, royalty-free licence to display that content as part of the service.",
      "You agree not to post content that is unlawful, harassing, defamatory, obscene, or that infringes any third-party intellectual property rights. We reserve the right to remove any content that violates these guidelines and to suspend or terminate accounts that repeatedly do so.",
      "Profile pictures and banner images you upload are stored via Vercel Blob. You confirm that you have the right to use any image you upload.",
    ],
  },
  {
    heading: "Streaming & Third-Party Sources",
    body: [
      "Episode streams are provided by third-party sources and are embedded within the Bankai player. We do not control, host, or guarantee the availability or quality of those streams. If you are the rights holder of content that appears on Bankai and wish to have it removed, please contact us via the Contact page.",
      "Bankai is intended for personal, non-commercial use only. Using the platform to redistribute, scrape, or commercially exploit any content is strictly prohibited.",
    ],
  },
  {
    heading: "Data We Collect",
    body: [
      "We collect only what is necessary to run the service: your username, hashed password, profile image (if provided), watchlist entries, watch history, reviews, and comments.",
      "Watch history is recorded per episode and includes playback progress so you can resume where you left off. This data is tied to your account and is not shared with third parties.",
      "We do not collect your email address, phone number, real name, or payment information. Bankai is entirely free with no paid tiers.",
    ],
  },
  {
    heading: "Cookies & Local Storage",
    body: [
      "Bankai does not use tracking cookies or third-party analytics. We use your browser's local storage solely to persist your session (if you choose \"Keep me logged in\") and your UI preferences such as theme and title language. Logging out clears the session data. You can clear local storage at any time through your browser settings.",
    ],
  },
  {
    heading: "Privacy & Data Sharing",
    body: [
      "We do not sell, rent, or share your personal data with advertisers, data brokers, or any third party. Your data is used exclusively to provide and improve the Bankai experience.",
      "We may disclose data if required by law or to protect the rights and safety of users or the platform.",
    ],
  },
  {
    heading: "Intellectual Property",
    body: [
      "The Bankai name, logo, and original design elements are the property of their respective creators. Anime titles, artwork, and related media belong to their original studios and licensors. Bankai claims no ownership over any third-party intellectual property displayed through the platform.",
    ],
  },
  {
    heading: "Disclaimers & Limitation of Liability",
    body: [
      "Bankai is provided \"as is\" without warranties of any kind. We do not guarantee uninterrupted availability, error-free operation, or that any specific stream will be accessible at any given time.",
      "To the fullest extent permitted by applicable law, Bankai and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
    ],
  },
  {
    heading: "Changes to These Terms",
    body: [
      "Bankai is an actively developed project and these terms may be updated as new features are added or as legal requirements change. The \"Last updated\" date at the top of this page reflects the most recent revision. We encourage you to review this page periodically.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-6 sm:px-10">
        <h1 className="text-3xl font-bold text-foreground">Terms &amp; Privacy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/40">Last updated 2026-08-03.</p>

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
