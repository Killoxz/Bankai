import { create } from "zustand";

interface SettingsModalStore {
  open: boolean;
  initialTab?: string;
  setOpen: (open: boolean, tab?: string) => void;
}

export const useSettingsModalStore = create<SettingsModalStore>((set) => ({
  open: false,
  initialTab: undefined,
  setOpen: (open, tab) => set({ open, initialTab: tab }),
}));
