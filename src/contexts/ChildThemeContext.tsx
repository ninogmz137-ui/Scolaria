/**
 * ChildThemeContext — Thème unique de l'app, identique pour tous les enfants.
 *
 * Les thèmes par enfant et par niveau sont supprimés (Addendum v3.4, phase 0).
 * La couleur personnelle de l'enfant (avatar + header Accueil uniquement)
 * arrivera avec le champ `students.color` (phase A).
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useSchoolMode, type SchoolModeTheme } from './SchoolModeContext';

// ─── Types ─────────────────────────────────────────────

interface ChildThemeContextValue {
  theme: SchoolModeTheme;
}

const ChildThemeContext = createContext<ChildThemeContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────

export function ChildThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useSchoolMode();

  return (
    <ChildThemeContext.Provider value={{ theme }}>
      {children}
    </ChildThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────

export function useChildTheme() {
  const ctx = useContext(ChildThemeContext);
  if (!ctx) {
    throw new Error('useChildTheme must be used within a ChildThemeProvider');
  }
  return ctx;
}
