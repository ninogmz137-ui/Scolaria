/**
 * DemoBanner — Discreet banner above the tab bar in demo mode.
 *
 * Shows "Mode démo · Données fictives" with a "Quitter" button.
 * Positioned just above the FloatingTabBar.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT } from './FloatingTabBar';

export default function DemoBanner() {
  const { isDemo, signOut } = useAuth();

  if (!isDemo) return null;

  return (
    <View style={s.banner}>
      <View style={s.pill}>
        <Text style={s.dot}>●</Text>
        <Text style={s.text}>Mode démo · Données fictives</Text>
        <Pressable onPress={signOut} hitSlop={8} style={s.quitBtn}>
          <Text style={s.quitText}>Quitter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: FLOATING_TAB_BAR_HEIGHT + 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.82)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    fontSize: 8,
    color: '#F59E0B',
  },
  text: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  quitBtn: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quitText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
