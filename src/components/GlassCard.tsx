/**
 * GlassCard — Mode-aware glass morphism card.
 *
 * Auto-detects dark/light mode from the child theme and applies
 * the correct glass style. On dark backgrounds the card is nearly
 * transparent with a subtle white border; on light backgrounds it
 * is frosted white with a stronger shadow.
 *
 * borderRadius: 20, borderCurve: 'continuous' everywhere.
 */

import { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { useChildTheme } from '../contexts/ChildThemeContext';

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
  /** Force dark or light variant (auto-detected if omitted) */
  variant?: 'dark' | 'light';
}

// ─── Opacity presets per variant ────────────────────────

const DARK_BG: Record<Intensity, number> = {
  subtle: 0.03,
  medium: 0.05,
  strong: 0.10,
};

const LIGHT_BG: Record<Intensity, number> = {
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
  variant,
}: GlassCardProps) {
  const { theme } = useChildTheme();
  const isDark = variant === 'dark' || (variant === undefined && theme.isDarkBg);

  const bgOpacity = isDark ? DARK_BG[intensity] : LIGHT_BG[intensity];
  const borderColor = isDark
    ? `rgba(255,255,255,${0.08 + bgOpacity * 0.5})`   // 0.10 – 0.15
    : 'rgba(0, 0, 0, 0.06)';                           // subtle, almost invisible

  const shadow = isDark
    ? {} // no shadow on dark glass
    : Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.10,
          shadowRadius: 1.5,
        },
        android: { elevation: 1 },
        default: {},
      });

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderColor,
          backgroundColor: `rgba(255,255,255,${bgOpacity})`,
          ...shadow,
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
    borderWidth: 0.5,
    // @ts-ignore — borderCurve is supported on iOS 17+
    borderCurve: 'continuous',
  },
  content: {
    padding: 16,
  },
});
