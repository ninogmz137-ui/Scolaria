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
    <View>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.row,
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
      {!isLast && <View style={styles.separatorInset} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.14)',
  },
  separatorInset: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 74,
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

