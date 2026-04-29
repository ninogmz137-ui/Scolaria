import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { ARIA_INDIGO } from '../../constants/theme';
import { FontFamily } from '../../hooks/useSolariaFonts';
import GlassCard from '../GlassCard';

type Props = {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
};

export default function RgpdHero({ Icon, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.glow} />
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon size={22} color={ARIA_INDIGO} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  glow: {
    position: 'absolute',
    top: -12,
    left: -8,
    right: -8,
    height: 120,
    borderRadius: 28,
    backgroundColor: 'rgba(67,56,202,0.06)',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.16)',
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: 0.2,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
});

