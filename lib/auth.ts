import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

// Build the provider list from whatever credentials are configured.
// Missing OAuth env vars simply hide that button — the app still runs.
const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_DISCORD_ID) providers.push(Discord);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);

// Demo email/guest login so auth is testable with zero OAuth setup.
providers.push(
  Credentials({
    id: "demo",
    name: "Email (demo)",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds) => {
      const email = creds?.email as string | undefined;
      if (!email) return null;
      // Demo only: accept any email. Replace with a real lookup + bcrypt check.
      return {
        id: email,
        email,
        name: email.split("@")[0],
        image: null,
      };
    },
  })
);

export const authConfig: NextAuthConfig = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** Which OAuth buttons to show on the login page. */
export const enabledOAuth = {
  google: !!process.env.AUTH_GOOGLE_ID,
  discord: !!process.env.AUTH_DISCORD_ID,
  github: !!process.env.AUTH_GITHUB_ID,
};
