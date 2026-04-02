/**
 * GlassCard — Glass morphism card on light backgrounds.
 *
 * All modes are now light. Cards are frosted white with a soft shadow,
 * NO border. borderRadius: 20, borderCurve: 'continuous' everywhere.
 */

import { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';

// ─── Types ─────────────────────────────────────────────

type Intensity = 'subtle' | 'medium' | 'strong';

interface GlassCardProps {
  children: ReactNode;
  /** Glass intensity preset, default 'medium' */
  intensity?: Intensity;
  /** Override border radius, default 20 */
  borderRadius?: number;
  /** Additional styles on the outer container */
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | undefined)[];
  /** No padding inside the card */
  noPadding?: boolean;
}

// ─── Opacity presets ───────────────────────────────────

const BG_OPACITY: Record<Intensity, number> = {
  subtle: 0.25,
  medium: 0.35,
  strong: 0.55,
};

// ─── Component ─────────────────────────────────────────

export default function GlassCard({
  children,
  intensity = 'medium',
  borderRadius = 20,
  style,
  noPadding = false,
}: GlassCardProps) {
  const bgOpacity = BG_OPACITY[intensity];

  return (
    <View
      style={[
        styles.container,
        styles.shadow,
        {
          borderRadius,
          backgroundColor: `rgba(255,255,255,${bgOpacity})`,
        },
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
    overflow: 'hidden',
    borderWidth: 0,
    // @ts-ignore — borderCurve is supported on iOS 17+
    borderCurve: 'continuous',
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as any,
  content: {
    padding: 16,
  },
});
