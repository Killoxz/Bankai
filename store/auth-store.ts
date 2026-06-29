import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  usernameLastChanged?: number | null;
}

interface AuthStore {
  currentUser: UserProfile | null;
  register: (
    email: string,
    username: string,
    password: string,
    avatar?: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<UserProfile, "username" | "avatar" | "name">>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,

      register: async (email, username, password, avatar = null) => {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, username, password, avatar }),
          });
          const data = await res.json();
          if (!res.ok) return { ok: false, error: data.error ?? "Sign-up failed." };
          set({ currentUser: { ...data.user, avatar: data.user.image } });
          return { ok: true };
        } catch {
          return { ok: false, error: "Network error. Please try again." };
        }
      },

      login: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) return { ok: false, error: data.error ?? "Sign-in failed." };
          set({ currentUser: { ...data.user, avatar: data.user.image } });
          return { ok: true };
        } catch {
          return { ok: false, error: "Network error. Please try again." };
        }
      },

      logout: () => set({ currentUser: null }),

      updateProfile: (patch) =>
        set((state) => {
          if (!state.currentUser) return state;
          const isUsernameChange = patch.username !== undefined && patch.username !== state.currentUser.username;
          return {
            currentUser: {
              ...state.currentUser,
              ...patch,
              ...(isUsernameChange ? { usernameLastChanged: Date.now() } : {}),
            },
          };
        }),
    }),
    { name: "bankai-auth" }
  )
);
