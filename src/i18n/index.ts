/**
 * i18n — Internationalisation de Scolaria.
 *
 * 10 langues : fr, ar (RTL), pt, es, en, tr, ro, zh, wo, it
 * Détection automatique de la langue du téléphone.
 */

import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr';
import ar from './locales/ar';
import pt from './locales/pt';
import es from './locales/es';
import en from './locales/en';
import tr from './locales/tr';
import ro from './locales/ro';
import zh from './locales/zh';
import wo from './locales/wo';
import it from './locales/it';

// ─── Supported languages ─────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'ar', label: 'العربية', flag: '🇲🇦', rtl: true },
  { code: 'pt', label: 'Português', flag: '🇧🇷', rtl: false },
  { code: 'es', label: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'en', label: 'English', flag: '🇬🇧', rtl: false },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ro', label: 'Română', flag: '🇷🇴', rtl: false },
  { code: 'zh', label: '中文', flag: '🇨🇳', rtl: false },
  { code: 'wo', label: 'Wolof', flag: '🇸🇳', rtl: false },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', rtl: false },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// ─── Create i18n instance ─────────────────────────────────

const i18n = new I18n({
  fr,
  ar,
  pt,
  es,
  en,
  tr,
  ro,
  zh,
  wo,
  it,
});

// Default: French
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;

// ─── Auto-detect device language ──────────────────────────

function detectDeviceLanguage(): LanguageCode {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      if (deviceLang && SUPPORTED_LANGUAGES.some((l) => l.code === deviceLang)) {
        return deviceLang as LanguageCode;
      }
    }
  } catch {
    // Fallback to French
  }
  return 'fr';
}

// ─── Persistence ──────────────────────────────────────────

const LANG_STORAGE_KEY = '@scolaria_language';

export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      setLanguage(saved as LanguageCode);
    } else {
      setLanguage(detectDeviceLanguage());
    }
  } catch {
    setLanguage(detectDeviceLanguage());
  }
}

export function setLanguage(code: LanguageCode): void {
  i18n.locale = code;

  // Handle RTL for Arabic
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  const isRTL = langConfig?.rtl ?? false;

  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }

  // Save preference
  AsyncStorage.setItem(LANG_STORAGE_KEY, code).catch(() => {});
}

export function getCurrentLanguage(): LanguageCode {
  return (i18n.locale || 'fr') as LanguageCode;
}

export function isRTL(): boolean {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === getCurrentLanguage());
  return lang?.rtl ?? false;
}

// ─── Translation helper ──────────────────────────────────

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export default i18n;
