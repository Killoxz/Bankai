import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileMenu: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: true,
      mobileMenuOpen: false,
      commandOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setMobileMenu: (v) => set({ mobileMenuOpen: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
    }),
    {
      name: "bankai-ui",
      // Don't persist drawer state — starts closed on every session.
      partialize: () => ({}),
    }
  )
);
