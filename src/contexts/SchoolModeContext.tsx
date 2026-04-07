/**
 * SchoolModeContext — Adapts the entire UI based on the child's school cycle.
 *
 * - Maternelle (3-6 ans): warm, playful, giant emojis
 * - Primaire (6-11 ans): cosmic dark, gamification, XP/badges
 * - Lycee (11-18 ans): clean white, analytics, optional dark mode
 *
 * Auto-detects from child's birth date.
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
  // Special
  headerGradient: [string, string];
  ariaColor: string;
  ariaEmoji: string;
  ariaLabel: string;
  // ─── Phase 1: Mode-aware backgrounds & headers ───
  /** Page background color per mode */
  backgroundColor: string;
  /** Full header gradient colors (top → page bg) */
  headerGradientFull: string[];
  /** Gradient stop locations (0-1), must match headerGradientFull length */
  headerGradientLocations: number[];
  /** Is the background dark? (drives text color logic) */
  isDarkBg: boolean;
  /** Primary text color on this background (outside cards) */
  textOnBg: string;
  /** Secondary text color on this background */
  textOnBgSecondary: string;
}

// ─── Theme definitions ─────────────────────────────────

/**
 * All school modes now share the SAME visual properties.
 * Unified blue design: #F2F2F7 background, blue gradient header.
 * Mode/label differ so MonRessenti can still distinguish cycles.
 */
const UNIFIED_BASE = {
  bg: '#F2F2F7',
  bgLight: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'transparent',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  tabBg: '#FFFFFF',
  tabBorder: 'transparent',
  tabInactive: '#94A3B8',
  // Unified violet accent
  accent: '#7C3AED',
  accentLight: '#C4B5FD',
  accentDark: '#6D28D9',
  tabActive: '#7C3AED',
  headerGradient: ['#7C3AED10', '#F2F2F7'] as [string, string],
  ariaColor: '#7C3AED',
  // Unified background + header
  backgroundColor: '#F2F2F7',
  headerGradientFull: ['#1E3A5F', '#3B7DD8', '#89B4E8'],
  headerGradientLocations: [0, 0.5, 1],
  isDarkBg: false,
  textOnBg: '#0F172A',
  textOnBgSecondary: '#64748B',
};

export const THEMES: Record<SchoolMode, SchoolModeTheme> = {
  maternelle: {
    ...UNIFIED_BASE,
    mode: 'maternelle',
    label: 'Maternelle',
    ariaEmoji: '🧸',
    ariaLabel: 'Aria',
  },
  primaire: {
    ...UNIFIED_BASE,
    mode: 'primaire',
    label: 'Primaire',
    ariaEmoji: '✦',
    ariaLabel: 'Aria ✦',
  },
  lycee: {
    ...UNIFIED_BASE,
    mode: 'lycee',
    label: 'Collège-Lycée',
    ariaEmoji: '🎯',
    ariaLabel: 'Aria Coach',
  },
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
