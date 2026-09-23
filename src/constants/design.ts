/**
 * SCOLARIA DESIGN TOKENS v3.0 — Source of truth
 * En cas de conflit avec tout autre fichier : CE FICHIER A PRIORITÉ
 */

import { Platform } from 'react-native';

export const C = {
  // Backgrounds
  bg: '#F2F1EE',
  white: '#FFFFFF',

  // Texte
  text: '#0F172A',
  text55: 'rgba(15,23,42,0.55)',
  text35: 'rgba(15,23,42,0.35)',
  text28: 'rgba(15,23,42,0.28)',

  // Borders
  border: 'rgba(15,23,42,0.06)',
  borderM: 'rgba(15,23,42,0.08)',
  borderL: 'rgba(15,23,42,0.05)',

  // Accent
  indigo: '#4338CA',

  // Sémantiques
  red: '#EF4444',
  green: '#059669',
  amber: '#F59E0B',
  rose: '#DB2777',

  // Gradients Aria UNIQUEMENT
  ariaFrom: '#6366F1',
  ariaTo: '#22D3EE',
} as const;

export const RADIUS = {
  card: 18,
  pill: 999,
  input: 14,
  sheet: 22,
  eventCard: 14,
  tag: 6,
} as const;

export const SHADOW = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: { elevation: 0 },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
  }),
  cardStrong: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    android: { elevation: 0 },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
  }),
  fab: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
    },
  }),
} as const;

// Bouton fixe en bas d'un écran en mode chrome 'none' (pas de BottomBar : navigation/chrome.ts).
// Le bouton se pose à `bottom: insets.bottom + STICKY_CTA_BOTTOM_GAP` ; le ScrollView réserve sa place
// avec getStickyCtaScrollPadding. L'inset du bas est compté ICI, une seule fois : l'écran ne doit
// pas avoir de SafeAreaView avec bord bas.
export const STICKY_CTA_HEIGHT = 52;
export const STICKY_CTA_BOTTOM_GAP = 12;
export function getStickyCtaScrollPadding(insetsBottom: number): number {
  return insetsBottom + STICKY_CTA_BOTTOM_GAP + STICKY_CTA_HEIGHT + 24;
}

export const TOP_BAR_HEIGHT = 56;
