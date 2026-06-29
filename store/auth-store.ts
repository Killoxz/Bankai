import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatar: string | null; // base64 data URL
  createdAt: number;
  usernameLastChanged?: number | null;
}

// Simple deterministic hash — demo only, not production-safe
function hashPassword(password: string): string {
  let h = 5381;
  const s = password + "bankai_salt_v1";
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36).padStart(8, "0");
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface AuthStore {
  users: UserProfile[];
  currentUser: UserProfile | null;
  register: (
    email: string,
    username: string,
    password: string,
    avatar?: string | null
  ) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  updateProfile: (patch: Partial<Pick<UserProfile, "username" | "avatar">>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,

      register: (email, username, password, avatar = null) => {
        const { users } = get();
        const em = email.trim().toLowerCase();
        const un = username.trim();

        if (!em || !un || !password)
          return { ok: false, error: "All fields are required." };
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))
          return { ok: false, error: "Enter a valid email address." };
        if (un.length < 2)
          return { ok: false, error: "Username must be at least 2 characters." };
        if (un.length > 20)
          return { ok: false, error: "Username must be 20 characters or less." };
        if (password.length < 6)
          return { ok: false, error: "Password must be at least 6 characters." };
        if (users.some((u) => u.email === em))
          return { ok: false, error: "An account with this email already exists." };
        if (users.some((u) => u.username.toLowerCase() === un.toLowerCase()))
          return { ok: false, error: "This username is already taken." };

        const user: UserProfile = {
          id: generateId(),
          email: em,
          username: un,
          passwordHash: hashPassword(password),
          avatar: avatar ?? null,
          createdAt: Date.now(),
        };

        set({ users: [...users, user], currentUser: user });
        return { ok: true };
      },

      login: (email, password) => {
        const em = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email === em);
        if (!user) return { ok: false, error: "No account found with this email." };
        if (user.passwordHash !== hashPassword(password))
          return { ok: false, error: "Incorrect password." };
        set({ currentUser: user });
        return { ok: true };
      },

      logout: () => set({ currentUser: null }),

      updateProfile: (patch) => {
        const { currentUser, users } = get();
        if (!currentUser) return;
        const isUsernameChange =
          patch.username !== undefined && patch.username !== currentUser.username;
        const updated = {
          ...currentUser,
          ...patch,
          ...(isUsernameChange ? { usernameLastChanged: Date.now() } : {}),
        };
        set({
          currentUser: updated,
          users: users.map((u) => (u.id === currentUser.id ? updated : u)),
        });
      },
    }),
    { name: "bankai-auth" }
  )
);
