import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ARIA_GRADIENT, ARIA_INDIGO } from '../../constants/theme';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../hooks/useSolariaFonts';

type Variant = 'primary' | 'outline' | 'destructive';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
};

export default function GradientButton({
  label,
  onPress,
  disabled,
  leftIcon,
  rightIcon,
  variant = 'primary',
  style,
}: Props) {
  const content = (
    <View style={styles.content}>
      {!!leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}
      <Text
        style={[
          styles.label,
          variant === 'outline' && { color: ARIA_INDIGO },
          variant === 'destructive' && { color: Colors.red },
        ]}
      >
        {label}
      </Text>
      {!!rightIcon && <View style={styles.iconSlot}>{rightIcon}</View>}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        style={({ pressed }) => [
          styles.base,
          { opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={[...ARIA_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.grad}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.base,
        styles.outline,
        variant === 'destructive' && styles.destructive,
        { opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  grad: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  destructive: {
    borderColor: 'rgba(248,113,113,0.35)',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconSlot: { alignItems: 'center', justifyContent: 'center' },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});

