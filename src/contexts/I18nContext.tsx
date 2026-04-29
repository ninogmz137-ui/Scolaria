/**
 * I18nContext — Fournit les traductions et le changement de langue
 * à toute l'application via React Context.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import {
  t as translate,
  setLanguage as setI18nLanguage,
  loadSavedLanguage,
  getCurrentLanguage,
  isRTL as checkRTL,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../i18n';

interface I18nContextValue {
  t: (key: string, options?: Record<string, any>) => string;
  locale: LanguageCode;
  setLocale: (code: LanguageCode) => void;
  isRTL: boolean;
  languages: typeof SUPPORTED_LANGUAGES;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  t: translate,
  locale: 'fr',
  setLocale: () => {},
  isRTL: false,
  languages: SUPPORTED_LANGUAGES,
  ready: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>('fr');
  const [isRTL, setIsRTL] = useState(false);
  const [ready, setReady] = useState(false);
  // Force re-render on language change
  const [, setTick] = useState(0);

  useEffect(() => {
    loadSavedLanguage().then(() => {
      const detected = getCurrentLanguage();
      setLocaleState(detected);
      setIsRTL(checkRTL());
      setReady(true);
    });
  }, []);

  const setLocale = useCallback((code: LanguageCode) => {
    setI18nLanguage(code);
    setLocaleState(code);
    setIsRTL(checkRTL());
    setTick((n) => n + 1);

    // RTL change requires app restart on some platforms
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    const needsRTL = langConfig?.rtl ?? false;
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);
    }
  }, []);

  const t = useCallback(
    (key: string, options?: Record<string, any>) => translate(key, options),
    [locale],
  );

  return (
    <I18nContext.Provider
      value={{ t, locale, setLocale, isRTL, languages: SUPPORTED_LANGUAGES, ready }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
