import type { Metadata } from "next";
import { AuthModal } from "@/components/auth/auth-modal";

export const metadata: Metadata = { title: "Join Now • Bankai" };

export default function SignupPage() {
  return <AuthModal mode="signup" />;
}
