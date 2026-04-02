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
 * All school modes now share a light background.
 * Text is always dark on light. Only accents and structural labels differ.
 */
const LIGHT_BASE = {
  bg: '#F7F8FC',
  bgLight: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#EEF0F5',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  tabBg: '#FFFFFF',
  tabBorder: '#EEF0F5',
  tabInactive: '#94A3B8',
};

export const THEMES: Record<SchoolMode, SchoolModeTheme> = {
  maternelle: {
    ...LIGHT_BASE,
    mode: 'maternelle',
    label: 'Maternelle',
    accent: '#FF8C42',
    accentLight: '#FFB07A',
    accentDark: '#E67A35',
    tabActive: '#FF8C42',
    headerGradient: ['#FF8C4210', '#F7F8FC'],
    ariaColor: '#FF8C42',
    ariaEmoji: '🧸',
    ariaLabel: 'Aria',
    // Phase 1
    backgroundColor: '#FFF8F0',
    headerGradientFull: ['#FF9F43', '#FFECD2', '#FFF8F0'],
    headerGradientLocations: [0, 0.5, 1],
    isDarkBg: false,
    textOnBg: '#0F172A',
    textOnBgSecondary: '#64748B',
  },
  primaire: {
    ...LIGHT_BASE,
    mode: 'primaire',
    label: 'Primaire',
    accent: '#22D3EE',
    accentLight: '#67E8F9',
    accentDark: '#0891B2',
    tabActive: '#22D3EE',
    headerGradient: ['#22D3EE10', '#F7F8FC'],
    ariaColor: '#22D3EE',
    ariaEmoji: '✦',
    ariaLabel: 'Aria ✦',
    // Phase 1
    backgroundColor: '#F0F7FF',
    headerGradientFull: ['#0B1628', '#164E63', '#F0F7FF'],
    headerGradientLocations: [0, 0.5, 1],
    isDarkBg: false,
    textOnBg: '#0F172A',
    textOnBgSecondary: '#64748B',
  },
  lycee: {
    ...LIGHT_BASE,
    mode: 'lycee',
    label: 'Collège-Lycée',
    accent: '#6D28D9',
    accentLight: '#7C3AED',
    accentDark: '#5B21B6',
    tabActive: '#6D28D9',
    headerGradient: ['#6D28D910', '#F7F8FC'],
    ariaColor: '#6D28D9',
    ariaEmoji: '🎯',
    ariaLabel: 'Aria Coach',
    // Phase 1
    backgroundColor: '#F8F7FF',
    headerGradientFull: ['#4C1D95', '#7C3AED', '#F8F7FF'],
    headerGradientLocations: [0, 0.4, 1],
    isDarkBg: false,
    textOnBg: '#0F172A',
    textOnBgSecondary: '#64748B',
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
