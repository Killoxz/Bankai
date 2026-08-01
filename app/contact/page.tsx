import type { Metadata } from "next";
import { Send, MessageCircle, Youtube, Instagram } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = { title: "Contact — Bankai" };

const CHANNELS = [
  { icon: Send, href: "#", label: "Telegram" },
  { icon: MessageCircle, href: "#", label: "Discord" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Instagram, href: "#", label: "Instagram" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-6 text-center sm:px-10">
        <h1 className="text-3xl font-bold text-white">Get in Touch</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
          Found a bug, have feedback, or just want to say hi? Reach out through any of these —
          we read everything.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          {CHANNELS.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white hover:text-black"
            >
              <Icon className="size-4" />
              {label}
            </a>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
