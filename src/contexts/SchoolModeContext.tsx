/**
 * SchoolModeContext — Cycle scolaire de l'enfant sélectionné (maternelle,
 * primaire, collège-lycée), déduit de sa date de naissance.
 *
 * Le cycle pilote le CONTENU (ex. Suivi), jamais les couleurs : tous les
 * cycles partagent le même thème (fond #F2F1EE, accent indigo #4338CA).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ─── Types ─────────────────────────────────────────────

export type SchoolMode = 'maternelle' | 'primaire' | 'lycee';

export interface SchoolModeTheme {
  mode: SchoolMode;
  label: string;
  // Backgrounds
  bg: string;
  bgLight: string;
  card: string;
  cardBorder: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Accents
  accent: string;
  accentLight: string;
  accentDark: string;
  // Tab bar
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  // Aria
  ariaColor: string;
  ariaLabel: string;
  /** Page background color */
  backgroundColor: string;
}

// ─── Theme definitions ─────────────────────────────────

/** Thème unique, commun à tous les cycles. */
const UNIFIED_BASE = {
  bg: '#F2F1EE',
  bgLight: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'transparent',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  tabBg: '#FFFFFF',
  tabBorder: 'transparent',
  tabInactive: '#94A3B8',
  accent: '#4338CA',
  accentLight: '#C7D2FE',
  accentDark: '#3730A3',
  tabActive: '#4338CA',
  ariaColor: '#4338CA',
  ariaLabel: 'Aria',
  backgroundColor: '#F2F1EE',
};

export const THEMES: Record<SchoolMode, SchoolModeTheme> = {
  maternelle: { ...UNIFIED_BASE, mode: 'maternelle', label: 'Maternelle' },
  primaire: { ...UNIFIED_BASE, mode: 'primaire', label: 'Primaire' },
  lycee: { ...UNIFIED_BASE, mode: 'lycee', label: 'Collège-Lycée' },
};

// ─── Age → Mode mapping ─────────────────────────────────

export function getSchoolModeFromAge(age: number): SchoolMode {
  if (age <= 6) return 'maternelle';
  if (age <= 11) return 'primaire';
  return 'lycee';
}

export function getSchoolModeFromBirthDate(birthDate: string | Date): SchoolMode {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return getSchoolModeFromAge(age);
}

// ─── Context ────────────────────────────────────────────

interface SchoolModeContextValue {
  mode: SchoolMode;
  theme: SchoolModeTheme;
  setMode: (mode: SchoolMode) => void;
  setModeFromBirthDate: (birthDate: string | Date) => void;
}

const SchoolModeContext = createContext<SchoolModeContextValue>({
  mode: 'primaire',
  theme: THEMES.primaire,
  setMode: () => {},
  setModeFromBirthDate: () => {},
});

export function SchoolModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SchoolMode>('primaire');

  const setMode = useCallback((m: SchoolMode) => {
    setModeState(m);
  }, []);

  const setModeFromBirthDate = useCallback((birthDate: string | Date) => {
    setModeState(getSchoolModeFromBirthDate(birthDate));
  }, []);

  return (
    <SchoolModeContext.Provider
      value={{ mode, theme: THEMES[mode], setMode, setModeFromBirthDate }}
    >
      {children}
    </SchoolModeContext.Provider>
  );
}

export function useSchoolMode() {
  return useContext(SchoolModeContext);
}
