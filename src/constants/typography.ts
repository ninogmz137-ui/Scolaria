/**
 * Typography constants and reusable text style presets.
 *
 * Fonts loaded via @expo-google-fonts in useSolariaFonts.ts:
 *   BarlowCondensed_600SemiBold / _700Bold / _800ExtraBold
 *   DMSans_400Regular / _500Medium / _600SemiBold / _700Bold
 *
 * RULE: never combine fontFamily + fontWeight — the weight is baked
 * into the font name. Mixing the two causes fallback on some platforms.
 */

// ─── Font family names ──────────────────────────────────

export const fonts = {
  // Barlow Condensed — display, data, section titles
  barlowSemiBold: 'BarlowCondensed_600SemiBold',
  barlowBold: 'BarlowCondensed_700Bold',
  barlowExtraBold: 'BarlowCondensed_800ExtraBold',
  // DM Sans — body, UI, buttons
  dmRegular: 'DMSans_400Regular',
  dmMedium: 'DMSans_500Medium',
  dmSemiBold: 'DMSans_600SemiBold',
  dmBold: 'DMSans_700Bold',
} as const;

// ─── Reusable text style presets ────────────────────────

export const textStyles = {
  // ── Barlow — display / data ──
  sectionTitle: {
    fontFamily: fonts.barlowBold,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    fontSize: 12,
  },
  dataNumber: {
    fontFamily: fonts.barlowBold,
    fontSize: 28,
  },
  dataLabel: {
    fontFamily: fonts.barlowSemiBold,
    textTransform: 'uppercase' as const,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badge: {
    fontFamily: fonts.barlowSemiBold,
    fontSize: 10,
  },
  calendarDay: {
    fontFamily: fonts.barlowSemiBold,
    textTransform: 'uppercase' as const,
    fontSize: 11,
  },
  calendarNumber: {
    fontFamily: fonts.barlowBold,
    fontSize: 16,
  },

  // ── DM Sans — body / UI ──
  screenTitle: {
    fontFamily: fonts.dmBold,
    fontSize: 22,
  },
  topbarGreeting: {
    fontFamily: fonts.dmSemiBold,
    fontSize: 18,
  },
  personName: {
    fontFamily: fonts.dmSemiBold,
    fontSize: 15,
  },
  body: {
    fontFamily: fonts.dmRegular,
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: fonts.dmRegular,
    fontSize: 12,
  },
  button: {
    fontFamily: fonts.dmBold,
    fontSize: 16,
  },
  link: {
    fontFamily: fonts.dmMedium,
    fontSize: 14,
  },
  logo: {
    fontFamily: fonts.dmBold,
    fontSize: 44,
  },
} as const;
