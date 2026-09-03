import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccentKey } from '@design/theme/accents';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UiState {
  theme: ThemeMode;
  accent: AccentKey;
  language: string;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  setLanguage: (lang: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'amber',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'anrix-ui',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
