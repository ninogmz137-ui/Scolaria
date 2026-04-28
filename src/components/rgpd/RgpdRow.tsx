import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { ARIA_INDIGO } from '../../constants/theme';
import { FontFamily } from '../../hooks/useSolariaFonts';

type Props = {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isLast?: boolean;
  rightSlot?: React.ReactNode;
};

export default function RgpdRow({
  Icon,
  title,
  subtitle,
  onPress,
  isLast,
  rightSlot,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon size={18} color={ARIA_INDIGO} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightSlot ?? <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.14)',
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});

