/**
 * ChildThemeContext — Per-child customizable color theme.
 *
 * Reads the active child's theme_id, derives a full color palette,
 * and merges it into the SchoolModeTheme so all existing consumers
 * of useSchoolMode() automatically get the child's custom colors.
 *
 * Also exposes `setChildTheme(childId, themeId)` for the theme selector.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSchoolMode, type SchoolModeTheme } from './SchoolModeContext';
import { useActiveChild } from './ActiveChildContext';
import {
  DEFAULT_THEME_ID,
  type ThemeId,
} from '../constants/themes';

// ─── Types ─────────────────────────────────────────────

interface ChildThemeContextValue {
  /** The merged theme: school mode structure + child custom colors */
  theme: SchoolModeTheme;
  /** Current child's theme_id */
  currentThemeId: string;
  /** Update a child's theme (persists in mock store, will use Supabase later) */
  setChildTheme: (childId: string, themeId: ThemeId) => void;
  /** Get a child's current theme_id */
  getChildThemeId: (childId: string) => string;
}

const ChildThemeContext = createContext<ChildThemeContextValue | null>(null);

// ─── Mock persistence (replaces Supabase PATCH for now) ──

const FORCE_MOCK = true;

// In-memory store for child → themeId mapping
const initialThemeMap: Record<string, string> = {
  '1': 'ambre',    // Léa → warm amber (matches maternelle feel)
  '2': 'ocean',    // Lucas → ocean blue (default)
  '3': 'lavande',  // Emma → lavender
};

// ─── Provider ──────────────────────────────────────────

export function ChildThemeProvider({ children }: { children: ReactNode }) {
  const { mode, theme: schoolTheme } = useSchoolMode();
  const { selectedChildId } = useActiveChild();
  const [themeMap, setThemeMap] = useState<Record<string, string>>(initialThemeMap);

  const currentThemeId = themeMap[selectedChildId] || DEFAULT_THEME_ID;

  // Unified design: child theme preferences are stored but do NOT affect
  // the rendered colors. All consumers receive the school mode theme as-is
  // with the unified blue accent (#3B82F6) for every child.
  const mergedTheme = useMemo<SchoolModeTheme>(() => {
    // schoolTheme already carries the unified values from THEMES.
    // We return it unchanged so every child sees the same blue palette.
    return schoolTheme;
  }, [schoolTheme]);

  const setChildTheme = useCallback(
    (childId: string, themeId: ThemeId) => {
      setThemeMap((prev) => ({ ...prev, [childId]: themeId }));

      // TODO: When Supabase tables exist, PATCH /students/:id { theme_id: themeId }
      if (!FORCE_MOCK) {
        // supabase.from('students').update({ theme_id: themeId }).eq('id', childId);
      }
    },
    [],
  );

  const getChildThemeId = useCallback(
    (childId: string) => themeMap[childId] || DEFAULT_THEME_ID,
    [themeMap],
  );

  return (
    <ChildThemeContext.Provider
      value={{
        theme: mergedTheme,
        currentThemeId,
        setChildTheme,
        getChildThemeId,
      }}
    >
      {children}
    </ChildThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────

/**
 * Returns the merged theme (school mode + child custom colors).
 * Falls back to useSchoolMode() if ChildThemeProvider is not mounted.
 */
export function useChildTheme() {
  const ctx = useContext(ChildThemeContext);
  if (!ctx) {
    throw new Error('useChildTheme must be used within a ChildThemeProvider');
  }
  return ctx;
}
