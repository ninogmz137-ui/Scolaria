import { useFonts } from 'expo-font';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Rufina_400Regular, Rufina_700Bold } from '@expo-google-fonts/rufina';

export const FontFamily = {
  // Display / impact — BarlowCondensed
  displaySemiBold: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  displayExtraBold: 'BarlowCondensed_800ExtraBold',
  // Corps / UI — DM Sans
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  // Marque — Rufina (wordmark, S + ✦ icône)
  rufinaRegular: 'Rufina_400Regular',
  rufinaBold: 'Rufina_700Bold',
  // Legacy aliases (keep for backward compat during migration)
  loraRegular: 'BarlowCondensed_600SemiBold',
  loraBold: 'BarlowCondensed_700Bold',
  loraItalic: 'BarlowCondensed_600SemiBold',
  loraBoldItalic: 'BarlowCondensed_700Bold',
} as const;

export function useSolariaFonts() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Rufina_400Regular,
    Rufina_700Bold,
  });

  return fontsLoaded;
}
