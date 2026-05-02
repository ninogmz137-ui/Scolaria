import { useFonts } from 'expo-font';
import {
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from '@expo-google-fonts/figtree';
import { Rufina_400Regular, Rufina_700Bold } from '@expo-google-fonts/rufina';

// ── Figure mapping (CLAUDE.md § Typography tokens) ─────────
// displaySemiBold  → Figtree_900Black   (dataLarge, Black)
// displayBold      → Figtree_800ExtraBold (display, ExtraBold)
// displayExtraBold → Figtree_800ExtraBold (display, ExtraBold)
// sansRegular      → Figtree_400Regular  (body)
// sansMedium       → Figtree_500Medium   (bodySecondary)
// sansSemiBold     → Figtree_600SemiBold (sectionLabel, subtitle)
// sansBold         → Figtree_700Bold     (subtitle, bold text)
// Legacy aliases kept for backward compat — they now resolve to Figtree

export const FontFamily = {
  // Display / impact — Figtree ExtraBold / Black
  displaySemiBold: 'Figtree_900Black',
  displayBold: 'Figtree_800ExtraBold',
  displayExtraBold: 'Figtree_800ExtraBold',
  // Corps / UI — Figtree
  sansRegular: 'Figtree_400Regular',
  sansMedium: 'Figtree_500Medium',
  sansSemiBold: 'Figtree_600SemiBold',
  sansBold: 'Figtree_700Bold',
  // Marque — Rufina (wordmark, S + ✦ icône)
  rufinaRegular: 'Rufina_400Regular',
  rufinaBold: 'Rufina_700Bold',
  // Legacy aliases (now resolve to Figtree equivalents)
  loraRegular: 'Figtree_400Regular',
  loraItalic: 'Figtree_400Regular',
  loraBold: 'Figtree_700Bold',
  loraBoldItalic: 'Figtree_700Bold',
} as const;

export function useSolariaFonts() {
  const [fontsLoaded, error] = useFonts({
    Figtree_300Light,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Figtree_900Black,
    Rufina_400Regular,
    Rufina_700Bold,
  });

  if (error) {
    console.error('Font loading error:', error);
  }

  return fontsLoaded;
}
