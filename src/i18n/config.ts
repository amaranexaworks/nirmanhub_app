import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';

/** Three languages: English + Telugu (తెలుగు) + Hindi (हिंदी). Add more locale files & register here. */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
] as const;

const SUPPORTED = LANGUAGES.map((l) => l.code) as readonly string[];

/** Restore the saved language (persisted by the UI store) before first render. */
function savedLanguage(): string {
  try {
    const raw = localStorage.getItem('anrix-ui');
    if (raw) {
      const lang = JSON.parse(raw)?.state?.language;
      if (typeof lang === 'string' && SUPPORTED.includes(lang)) return lang;
    }
  } catch {
    /* ignore */
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
  },
  lng: savedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
