import { useEffect, type ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { useUiStore } from '@stores/uiStore';
import { initSync } from '@services/sync';
import i18n from '@i18n/config';

/** Applies the persisted language to i18next whenever it changes. */
function LanguageSync({ children }: { children: ReactNode }) {
  const language = useUiStore((s) => s.language);
  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);
  return <>{children}</>;
}

/** Single composition point for app-wide providers. */
export function AppProviders({ children }: { children: ReactNode }) {
  // Boot the offline-sync engine once: watch connectivity and flush any writes
  // queued while offline (attendance, wages, expenses) as soon as we reconnect.
  useEffect(() => { void initSync(); }, []);

  return (
    <QueryProvider>
      <ThemeProvider>
        <LanguageSync>{children}</LanguageSync>
      </ThemeProvider>
    </QueryProvider>
  );
}
