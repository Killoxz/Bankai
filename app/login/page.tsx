import type { Metadata } from "next";
import { AuthModal } from "@/components/auth/auth-modal";

export const metadata: Metadata = { title: "Log In — Bankai" };

export default function LoginPage() {
  return <AuthModal mode="login" />;
}
