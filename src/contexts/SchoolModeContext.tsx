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
}

// ─── Theme definitions ─────────────────────────────────

export const THEMES: Record<SchoolMode, SchoolModeTheme> = {
  maternelle: {
    mode: 'maternelle',
    label: 'Maternelle',
    bg: '#FFF8F0',
    bgLight: '#FFF2E5',
    card: '#FFFFFF',
    cardBorder: 'rgba(255,140,66,0.15)',
    textPrimary: '#2D1B0E',
    textSecondary: '#6B4C35',
    textMuted: '#B8956A',
    accent: '#FF8C42',
    accentLight: '#FFB07A',
    accentDark: '#E67A35',
    tabBg: '#FFF2E5',
    tabBorder: 'rgba(255,140,66,0.12)',
    tabActive: '#FF8C42',
    tabInactive: '#C4A882',
    headerGradient: ['#FFB07A', '#FFF2E5'],
    ariaColor: '#FF8C42',
    ariaEmoji: '🧸',
    ariaLabel: 'Aria',
  },
  primaire: {
    mode: 'primaire',
    label: 'Primaire',
    bg: '#0B0F2A',
    bgLight: '#131836',
    card: '#1A1F3D',
    cardBorder: 'rgba(255,255,255,0.06)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E7EB',
    textMuted: '#9CA3AF',
    accent: '#22D3EE',
    accentLight: '#67E8F9',
    accentDark: '#0891B2',
    tabBg: '#0B0F2A',
    tabBorder: 'rgba(255,255,255,0.06)',
    tabActive: '#22D3EE',
    tabInactive: '#9CA3AF',
    headerGradient: ['#6D28D9', '#0B0F2A'],
    ariaColor: '#22D3EE',
    ariaEmoji: '✦',
    ariaLabel: 'Aria ✦',
  },
  lycee: {
    mode: 'lycee',
    label: 'Collège-Lycée',
    bg: '#F8F9FB',
    bgLight: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#9CA3AF',
    accent: '#6D28D9',
    accentLight: '#7C3AED',
    accentDark: '#5B21B6',
    tabBg: '#FFFFFF',
    tabBorder: 'rgba(0,0,0,0.06)',
    tabActive: '#6D28D9',
    tabInactive: '#9CA3AF',
    headerGradient: ['#F3F0FF', '#F8F9FB'],
    ariaColor: '#6D28D9',
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
