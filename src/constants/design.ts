/**
 * SCOLARIA DESIGN TOKENS v3.0 — Source of truth
 * En cas de conflit avec tout autre fichier : CE FICHIER A PRIORITÉ
 */

import { Platform } from 'react-native';

export const C = {
  // Backgrounds
  // Fond « Brume » (16 nov. 2026) : SEULE source de la couleur de fond de page de toute l'app.
  bg: '#F3F4FA',
  white: '#FFFFFF',

  // Texte
  text: '#0F172A',
  text55: 'rgba(15,23,42,0.55)',
  text35: 'rgba(15,23,42,0.35)',
  text28: 'rgba(15,23,42,0.28)',

  // Borders
  border: 'rgba(15,23,42,0.07)', // bordure des cartes (seule séparation visible sur Android)
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
  card: 16,
  pill: 999,
  input: 14,
  sheet: 22,
  eventCard: 14,
  tag: 6,
} as const;

// Ombres : DEUX jetons seulement pour toute l'app (décision du 17 nov. 2026).
//  - card : cartes de contenu. Android elevation 0 (une élévation dessine un cadre gris sur une carte,
//    leçons du 2 avr. et du 26 sept.) ; la bordure C.border suffit.
//  - flottant : feuilles, menus, top bar, barre de saisie, boutons ronds. Android elevation 16, au-dessus
//    du contenu (0) ET du voile / de la barre du bas (12 / 13) : Android trie par élévation avant zIndex.
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
  flottant: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: { elevation: 16 },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
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
