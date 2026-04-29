import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  size: number;
  backgroundColor: string;
  /**
   * Border is important on Android (no shadow) to keep the "glass" separation crisp.
   * Defaults are tuned for light backgrounds; override for dark headers.
   */
  borderColor?: string;
  borderWidth?: number;
  accessibilityLabel?: string;
  hitSlop?: number;
  /** Android-only optical nudge (px) for icon centering. */
  androidIconNudgeX?: number;
  /** Android-only optical nudge (px) for icon centering. */
  androidIconNudgeY?: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function RoundGlassIconButton({
  onPress,
  disabled,
  size,
  backgroundColor,
  borderColor = Platform.OS === 'android' ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255,255,255,0.18)',
  borderWidth = 1,
  accessibilityLabel,
  hitSlop = 10,
  androidIconNudgeX = 0,
  androidIconNudgeY = 0,
  children,
  style,
}: Props) {
  const radius = size / 2;

  return (
    <View
      style={[
        styles.shadowWrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.35 : 1,
        },
        Platform.OS === 'android' && styles.androidNoShadow,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.pressable,
          {
            borderRadius: radius,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
        // Android ripple + elevation is a common source of inner-ring artifacts.
        // We intentionally keep ripple off and rely on opacity feedback.
        android_ripple={undefined}
      >
        <View
          pointerEvents="none"
          style={[
            styles.iconSlot,
            { width: size, height: size },
            Platform.OS === 'android'
              ? { marginLeft: androidIconNudgeX, marginTop: androidIconNudgeY }
              : undefined,
          ]}
        >
          {children}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  androidNoShadow: {
    elevation: 0,
  },
  pressable: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

