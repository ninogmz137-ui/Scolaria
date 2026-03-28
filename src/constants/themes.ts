/**
 * Custom color themes for per-child personalization.
 *
 * Each theme defines a bg (dark background), accent (primary color), and accentLight.
 * These are combined with the school mode's structural properties to produce
 * a full SchoolModeTheme at runtime.
 *
 * Default theme for new children: 'ocean'
 */

export interface ChildTheme {
  id: string;
  bg: string;
  accent: string;
  accentLight: string;
  name: string;
}

export const CHILD_THEMES: Record<string, ChildTheme> = {
  ocean:   { id: 'ocean',   bg: '#0D1B3E', accent: '#4A90D9', accentLight: '#93C5FD', name: 'Océan' },
  glacier: { id: 'glacier', bg: '#08141E', accent: '#0EA5E9', accentLight: '#BAE6FD', name: 'Glacier' },
  ambre:   { id: 'ambre',   bg: '#1F1208', accent: '#FBBF24', accentLight: '#FCD34D', name: 'Ambre' },
  corail:  { id: 'corail',  bg: '#1C0E0C', accent: '#EF4444', accentLight: '#FCA5A5', name: 'Corail' },
  rose:    { id: 'rose',    bg: '#1C0C14', accent: '#EC4899', accentLight: '#F9A8D4', name: 'Rose' },
  teal:    { id: 'teal',    bg: '#071A1A', accent: '#14B8A6', accentLight: '#5EEAD4', name: 'Teal' },
  lavande: { id: 'lavande', bg: '#110C1F', accent: '#A78BFA', accentLight: '#C4B5FD', name: 'Lavande' },
  foret:   { id: 'foret',   bg: '#1A2A1A', accent: '#4CAF50', accentLight: '#A5D6A7', name: 'Forêt' },
  violet:  { id: 'violet',  bg: '#1A1A2E', accent: '#7C3AED', accentLight: '#A78BFA', name: 'Violet' },
};

export const DEFAULT_THEME_ID = 'ocean';

/** All available theme IDs in display order (3x3 grid) */
export const THEME_IDS = [
  'ocean', 'glacier', 'ambre',
  'corail', 'rose', 'teal',
  'lavande', 'foret', 'violet',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/**
 * Returns a ChildTheme, falling back to 'ocean' if the id is unknown or null.
 */
export function getChildTheme(themeId: string | null | undefined): ChildTheme {
  if (!themeId || !CHILD_THEMES[themeId]) {
    return CHILD_THEMES[DEFAULT_THEME_ID];
  }
  return CHILD_THEMES[themeId];
}

/**
 * Lighten/darken helper: mix a hex color with a factor.
 * factor > 0 → lighter, factor < 0 → darker.
 */
function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const adjust = (c: number) => {
    if (factor > 0) return Math.round(c + (255 - c) * factor);
    return Math.round(c * (1 + factor));
  };

  const nr = Math.min(255, Math.max(0, adjust(r)));
  const ng = Math.min(255, Math.max(0, adjust(g)));
  const nb = Math.min(255, Math.max(0, adjust(b)));

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Derive a full light-mode palette from a ChildTheme.
 * Background is always #F7F8FC, cards #FFFFFF — only the accent changes per child.
 */
export function deriveThemePalette(theme: ChildTheme) {
  const { accent, accentLight } = theme;
  const accentDark = adjustBrightness(accent, -0.25);

  return {
    bg: '#F7F8FC',
    bgLight: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#EEF0F5',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    accent,
    accentLight,
    accentDark,
    tabBg: '#FFFFFF',
    tabBorder: '#EEF0F5',
    tabActive: accent,
    tabInactive: '#94A3B8',
    headerGradient: [accent + '10', '#F7F8FC'] as [string, string],
    ariaColor: accent,
  };
}
