import { useFonts } from 'expo-font';
import {
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_600SemiBold_Italic,
  Lora_700Bold_Italic,
} from '@expo-google-fonts/lora';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

export const FontFamily = {
  loraRegular: 'Lora_600SemiBold',
  loraBold: 'Lora_700Bold',
  loraItalic: 'Lora_600SemiBold_Italic',
  loraBoldItalic: 'Lora_700Bold_Italic',
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export function useSolariaFonts() {
  const [fontsLoaded] = useFonts({
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_600SemiBold_Italic,
    Lora_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  return fontsLoaded;
}
