import { StyleSheet } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

/** Shared primary CTA for Mon ressenti (all school modes). */
export const ressentiSubmitStyles = StyleSheet.create({
  button: {
    marginTop: 36,
    width: '100%',
    height: 52,
    borderRadius: 28,
    backgroundColor: '#1A2340',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
