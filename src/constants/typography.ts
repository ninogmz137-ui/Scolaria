/**
 * Typography constants and reusable text style presets.
 *
 * Font family: Figtree (unique) — COMPONENTS.md §15
 * Fonts loaded in useSolariaFonts.ts via @expo-google-fonts/figtree
 *
 * RULE: never combine fontFamily + fontWeight — the weight is baked
 * into the font name. Mixing the two causes fallback on some platforms.
 *
 * Rufina: brand wordmark ONLY (ScolariaLogo)
 */

// ─── Font family names (via FontFamily from useSolariaFonts) ─

// ─── Reusable text style presets (Figtree-based) ─────────

export const textStyles = {
  // ── Display / impact — Figtree Black/ExtraBold ──
  sectionTitle: {
    fontFamily: 'Figtree_700Bold',
    textTransform: 'uppercase' as const,
    letterSpacing: 1.1,
    fontSize: 12,
  },
  dataNumber: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 28,
  },
  dataLabel: {
    fontFamily: 'Figtree_600SemiBold',
    textTransform: 'uppercase' as const,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badge: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 10,
  },
  calendarDay: {
    fontFamily: 'Figtree_600SemiBold',
    textTransform: 'uppercase' as const,
    fontSize: 11,
  },
  calendarNumber: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
  },

  // ── Body / UI — Figtree Regular/Medium/SemiBold ──
  screenTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 22,
  },
  topbarGreeting: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
  },
  personName: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 15,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12,
  },
  button: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
  },
  link: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  logo: {
    fontFamily: 'Rufina_700Bold',  // Exception: Rufina for logo only
    fontSize: 44,
  },
} as const;
