/**
 * GlassCard — semi-transparent card (no backdrop blur; Android-safe).
 *
 * Light: rgba white 85% + soft shadow. Dark variant for headers / dark wallpapers.
 */

import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

import { GLASS_CARD_RADIUS, nativeGlassCardShadow } from '../constants/theme';

// ─── Types ─────────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode;
  /** Override border radius — default matches design system */
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
  borderRadius = GLASS_CARD_RADIUS,
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
      <View style={noPadding ? undefined : styles.content}>{children}</View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
    ...nativeGlassCardShadow,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    ...nativeGlassCardShadow,
  },
  content: {
    padding: 16,
  },
});
