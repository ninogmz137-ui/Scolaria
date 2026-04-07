/**
 * DemoBanner — Discreet banner above the tab bar in demo mode.
 *
 * Shows "Mode démo · Données fictives" with a "Quitter" button.
 * Positioned just above the FloatingTabBar.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

export default function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isDemo) return null;

  return (
    <View style={[s.banner, { top: insets.top }]}>
      <View style={s.pill}>
        <Text style={s.dot}>●</Text>
        <Text style={s.text}>Mode démo · Données fictives</Text>
        <Text style={s.separator}>—</Text>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={s.quitText}>Quitter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,35,64,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 5,
    height: 28,
  },
  dot: {
    fontSize: 6,
    color: '#F59E0B',
  },
  text: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  separator: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  quitText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
});
