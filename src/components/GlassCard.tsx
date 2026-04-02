/**
 * GlassCard — Simple white card, no glass morphism.
 *
 * Unified design: all backgrounds are #F2F2F7 (light grey).
 * Cards are solid white (#FFFFFF) with no shadow, no border, no elevation.
 */

import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

// ─── Types ─────────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode;
  /** Override border radius, default 16 */
  borderRadius?: number;
  /** Additional styles on the outer container */
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | undefined)[];
  /** No padding inside the card */
  noPadding?: boolean;
}

// ─── Component ─────────────────────────────────────────

export default function GlassCard({
  children,
  borderRadius = 16,
  style,
  noPadding = false,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.container,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0,
    overflow: 'hidden',
    // @ts-ignore — borderCurve is supported on iOS 17+
    borderCurve: 'continuous',
    // No shadow, no elevation — zero grey outlines on any platform
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderColor: 'transparent',
  },
  content: {
    padding: 16,
  },
});
