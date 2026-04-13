/**
 * GlassCard — Glass morphism card with semi-transparent background.
 *
 * Light mode (default): white 75% opacity (Android-friendly — no backdrop blur).
 * Dark mode (dark=true): white 12% opacity.
 *
 * No backdropFilter — not supported on Android with React Native.
 */

import { type ReactNode } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';

// ─── Types ─────────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode;
  /** Override border radius, default 18 */
  borderRadius?: number;
  /** Additional styles on the outer container */
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | undefined)[];
  /** No padding inside the card */
  noPadding?: boolean;
  /** Dark variant for dark backgrounds (wallpaper, headers) */
  dark?: boolean;
  /** onPress handler — if set, wraps in a pressable-like view */
  onPress?: () => void;
}

// ─── Component ─────────────────────────────────────────

export default function GlassCard({
  children,
  borderRadius = 18,
  style,
  noPadding = false,
  dark = false,
}: GlassCardProps) {
  return (
    <View
      style={[
        dark ? styles.containerDark : styles.container,
        { borderRadius },
        style,
      ]}
    >
      <View style={noPadding ? undefined : styles.content}>
        {children}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
        shadowColor: 'transparent',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
    }),
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 1,
        shadowColor: 'transparent',
      },
      default: {},
    }),
  },
  content: {
    padding: 16,
  },
});
