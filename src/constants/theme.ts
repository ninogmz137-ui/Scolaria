/**
 * Native-first layout tokens (iOS / Android / web).
 * Prefer these over boxShadow / backdropFilter outside web-specific branches.
 */

import { Platform, StyleSheet, type ViewStyle } from 'react-native';

/** Glass cards — GlassCard + shared “premium” surfaces */
export const GLASS_CARD_RADIUS = 20;

export const nativeGlassCardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  /* Android: elevation on cards draws a grey frame outline (lesson 2026-04-02).
     Cards rely on background contrast only; only floating UI keeps elevation. */
  android: {
    elevation: 0,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
}) as ViewStyle;

/** White / light interactive surfaces (search pills, icon buttons, settings rows) */
export const nativeWhiteInteractiveShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
}) as ViewStyle;

/** Inactive filter / small pills on off-white backgrounds */
export const nativeInactivePillShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
}) as ViewStyle;

/** Aria suggestion chips */
export const nativeAriaSuggestionShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
}) as ViewStyle;

/** Screen backgrounds referenced in native polish pass */
export const PAGE_BG_OFF_WHITE = '#F7F7F9' as const;
export const PILL_ACTIVE_NAVY = '#0F1B2D' as const;

/**
 * Aria brand tokens.
 * `ARIA_INDIGO` — identité statique (texte « Aria », icônes, petits badges).
 * `ARIA_GRADIENT_*` — animations, halos, boutons gradient.
 * Ne pas confondre avec le thème enfant Violet (#7C3AED) qui reste séparé.
 */
export const ARIA_INDIGO = '#4338CA' as const;
export const ARIA_GRADIENT_VIOLET = '#6366F1' as const;
export const ARIA_GRADIENT_CYAN = '#22D3EE' as const;
export const ARIA_GRADIENT = [ARIA_GRADIENT_VIOLET, ARIA_GRADIENT_CYAN] as const;

/** Taille des boutons ronds (historique / nouvelle discussion) dans la top bar Aria. */
export const ARIA_TOP_BAR_BTN = 40 as const;

/**
 * Aria top bar: 40px round white icon buttons.
 * Android: `elevation` on `Pressable` is often a no-op; use a `View` layer + `Pressable` in `…Fill`
 * (see `ariaTopBarStack*`).
 */
export const ariaTopBarIconButton: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  zIndex: 2,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
    },
    android: {
      elevation: 10,
      borderWidth: 1,
      borderColor: 'rgba(15, 23, 42, 0.1)',
    },
    default: {},
  }),
} as ViewStyle;

export const ariaTopBarStackFrame: ViewStyle = {
  width: ARIA_TOP_BAR_BTN,
  height: ARIA_TOP_BAR_BTN,
  overflow: 'visible',
};

export const ariaTopBarStackShadow: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  zIndex: 0,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    android: {
      elevation: 10,
      borderWidth: 1,
      borderColor: 'rgba(15, 23, 42, 0.12)',
    },
    default: {},
  }),
} as ViewStyle;

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
export const androidFloatingWhitePill: ViewStyle = Platform.select({
  android: {
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
  },
  default: {},
}) as ViewStyle;
