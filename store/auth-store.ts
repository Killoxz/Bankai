"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StoredUser {
  username: string;
  passwordHash: string;
  createdAt: number;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface AuthState {
  users: Record<string, StoredUser>;
  currentUser: string | null;
  remember: boolean;
  /** Returns an error message, or null on success. */
  signup: (username: string, password: string) => Promise<string | null>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  setRemember: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: {},
      currentUser: null,
      remember: true,

      async signup(username, password) {
        const name = username.trim();
        if (name.length < 3) return "Username must be at least 3 characters.";
        if (password.length < 6) return "Password must be at least 6 characters.";
        const key = name.toLowerCase();
        if (get().users[key]) return "That username is already taken.";
        const passwordHash = await sha256(password);
        set((s) => ({
          users: { ...s.users, [key]: { username: name, passwordHash, createdAt: Date.now() } },
          currentUser: name,
        }));
        return null;
      },

      async login(username, password) {
        const key = username.trim().toLowerCase();
        const user = get().users[key];
        if (!user) return "No account found with that username.";
        if (user.passwordHash !== (await sha256(password))) return "Incorrect password.";
        set({ currentUser: user.username });
        return null;
      },

      logout: () => set({ currentUser: null }),
      setRemember: (v) => set({ remember: v }),
    }),
    {
      name: "bankai-auth",
      // Accounts always persist; the session only persists when "Keep me Logged In" is on
      partialize: (s) => ({
        users: s.users,
        remember: s.remember,
        currentUser: s.remember ? s.currentUser : null,
      }),
    }
  )
);
