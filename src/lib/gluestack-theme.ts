/**
 * Scolaria Gluestack Theme — maps our design tokens to Tailwind/NativeWind classes.
 *
 * Use `useThemeClasses()` to get ready-to-use className strings that
 * respect the current child theme and school mode.
 */

import { useMemo } from 'react';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { SCREEN_BACKGROUND } from '../constants/colors';

/** Semantic color tokens (from spec) */
export const ScolariaTokens = {
  primary:       '#6366F1',
  primaryLight:  '#818CF8',
  primaryDark:   '#6D28D9',
  background:    SCREEN_BACKGROUND,
  card:          '#FFFFFF',
  text:          '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  accentOcean:   '#4A90D9',
  success:       '#22C55E',
  warning:       '#FBBF24',
  danger:        '#EF4444',
  info:          '#0EA5E9',
} as const;

/**
 * Hook returning convenience className strings for the active theme.
 *
 * Meant for the gradual migration period: components that already
 * consume `useChildTheme()` can start using NativeWind classes
 * while keeping inline styles as a fallback for dynamic values.
 */
export function useThemeClasses() {
  const { theme } = useChildTheme();

  return useMemo(
    () => ({
      // ─── Backgrounds ────────────────────────────────
      bgScreen:  `bg-[${theme.bg}]`,
      bgCard:    `bg-[${theme.card}]`,
      bgAccent:  `bg-[${theme.accent}]`,

      // ─── Text ───────────────────────────────────────
      textPrimary:   `text-[${theme.textPrimary}]`,
      textSecondary: `text-[${theme.textSecondary}]`,
      textMuted:     `text-[${theme.textMuted}]`,
      textAccent:    `text-[${theme.accent}]`,
      textInverse:   'text-white',

      // ─── Borders ────────────────────────────────────
      borderCard:   `border border-[${theme.cardBorder}]`,
      borderAccent: `border border-[${theme.accent}]`,

      // ─── Common combos ──────────────────────────────
      card:       `bg-[${theme.card}] border border-[${theme.cardBorder}] rounded-2xl`,
      cardSolid:  `bg-[${theme.card}] rounded-2xl`,
      pill:       `bg-[${theme.accent}] rounded-full px-4 py-2`,
      btnPrimary: `bg-[${theme.accent}] rounded-xl px-6 py-3 items-center`,
      btnOutline: `border border-[${theme.accent}] rounded-xl px-6 py-3 items-center`,
    }),
    [theme],
  );
}
