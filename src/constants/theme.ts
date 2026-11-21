/**
 * Native-first layout tokens (iOS / Android / web).
 * Prefer these over boxShadow / backdropFilter outside web-specific branches.
 */

import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { C, RADIUS, SHADOW } from './design';

// Ombres et rayon : ALIAS des jetons de design.ts (lot 1, 17 nov. 2026). Aucune valeur propre ici :
// la seule source est design.ts (SHADOW.card, SHADOW.flottant, RADIUS.card).

/** Cartes (ex-« glass ») */
export const GLASS_CARD_RADIUS = RADIUS.card;
export const nativeGlassCardShadow = SHADOW.card as ViewStyle;

/** Surfaces interactives flottantes (pills de recherche, boutons ronds) */
export const nativeWhiteInteractiveShadow = SHADOW.flottant as ViewStyle;

/** Suggestions de l'assistant (pills posées sur le fond) */
export const nativeAriaSuggestionShadow = SHADOW.card as ViewStyle;

/** Fond de page : alias de C.bg (design.ts), seule source de la couleur de fond. */
export const PAGE_BG_OFF_WHITE = C.bg;
export const PILL_ACTIVE_NAVY = '#0F1B2D' as const;

/**
 * Aria brand tokens.
 * `ARIA_INDIGO` — identité statique (texte « Aria », icônes, petits badges).
 * `ARIA_GRADIENT_*` — animations, halos, boutons gradient.
 */
export const ARIA_INDIGO = '#4338CA' as const;
export const ARIA_GRADIENT_VIOLET = '#6366F1' as const;
export const ARIA_GRADIENT_CYAN = '#22D3EE' as const;
export const ARIA_GRADIENT = [ARIA_GRADIENT_VIOLET, ARIA_GRADIENT_CYAN] as const;

/** Taille des boutons ronds (historique / nouvelle discussion) dans la top bar Aria. */
export const ARIA_TOP_BAR_BTN = 40 as const;

export const ariaTopBarStackFrame: ViewStyle = {
  width: ARIA_TOP_BAR_BTN,
  height: ARIA_TOP_BAR_BTN,
  overflow: 'visible',
};

/**
 * Cible 40px — ne pas utiliser `absoluteFill` ici : sur Android Yoga place parfois
 * le contenu du Pressable légèrement en bas à droite. Dimensions + left/top explicites.
 */
export const ariaTopBarStackPress: ViewStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: ARIA_TOP_BAR_BTN,
  height: ARIA_TOP_BAR_BTN,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
  borderRadius: 20,
  ...Platform.select({
    android: { padding: 0, margin: 0 },
  }),
};

/** Slot de centrage pour le glyphe Lucide (viewBox 24) dans le cercle 40. */
export const ariaTopBarIconSlot: ViewStyle = {
  width: ARIA_TOP_BAR_BTN,
  height: ARIA_TOP_BAR_BTN,
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none' as any,
};

/** Messagerie / Aria : pill blanche flottante (recherche, filtre) — Android lit surtout elevation + bord. */
export const androidFloatingWhitePill: ViewStyle =
  Platform.OS === 'android'
    ? { ...(SHADOW.flottant as ViewStyle), borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.1)' }
    : {};
