import { useEffect, type ReactNode } from 'react';
import { useUiStore } from '@stores/uiStore';
import { accentOf, accentVars } from '@design/theme/accents';

/**
 * Applies the `.dark` class on <html>. The app ships a single fixed brand
 * palette — white surfaces, amber accent, charcoal ink — defined in
 * variables.css. Any legacy per-user accent override persisted in localStorage
 * is cleared here so everyone sees the one theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  // dark mode
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    };

    apply();
    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [theme]);

  // Lock to the stylesheet default palette — strip any persisted accent override.
  useEffect(() => {
    const root = document.documentElement;
    Object.keys(accentVars(accentOf('amber'))).forEach((k) => root.style.removeProperty(k));
  }, []);

  return <>{children}</>;
}
