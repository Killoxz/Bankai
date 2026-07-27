"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  currentUser: string | null;
  remember: boolean;
  /** Returns an error message, or null on success. */
  signup: (username: string, password: string) => Promise<string | null>;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  setRemember: (v: boolean) => void;
}

async function callAuthApi(
  path: "signup" | "login",
  username: string,
  password: string
): Promise<{ username?: string; error?: string }> {
  try {
    const res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Something went wrong. Please try again." };
    return { username: data.user.username };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      remember: true,

      async signup(username, password) {
        const { username: name, error } = await callAuthApi("signup", username, password);
        if (error) return error;
        set({ currentUser: name! });
        return null;
      },

      async login(username, password) {
        const { username: name, error } = await callAuthApi("login", username, password);
        if (error) return error;
        set({ currentUser: name! });
        return null;
      },

      logout: () => set({ currentUser: null }),
      setRemember: (v) => set({ remember: v }),
    }),
    {
      name: "bankai-auth",
      // The account itself lives in Postgres; only the "stay signed in"
      // convenience flag and cached session survive in the browser.
      partialize: (s) => ({
        remember: s.remember,
        currentUser: s.remember ? s.currentUser : null,
      }),
    }
  )
);
