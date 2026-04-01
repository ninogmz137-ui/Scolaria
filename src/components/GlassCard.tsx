/**
 * GlassCard — Translucent glass morphism card used across all screens.
 *
 * iOS: Uses BlurView from expo-blur for real backdrop blur.
 * Android: Falls back to semi-transparent white (no native blur support).
 */

import { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: ReactNode;
  /** Blur intensity (iOS only), default 20 */
  intensity?: number;
  /** Border radius, default 16 */
  borderRadius?: number;
  /** Additional styles on the outer container */
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | undefined)[];
  /** Override background opacity (0-1), default 0.75 */
  opacity?: number;
  /** No padding inside the card */
  noPadding?: boolean;
}

export default function GlassCard({
  children,
  intensity = 20,
  borderRadius = 16,
  style,
  opacity = 0.75,
  noPadding = false,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.container,
        { borderRadius },
        // Android fallback: opaque white bg instead of blur
        Platform.OS === 'android' && {
          backgroundColor: `rgba(255,255,255,${Math.min(opacity + 0.1, 0.92)})`,
        },
        style,
      ]}
    >
      {/* iOS blur layer */}
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={intensity}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          experimentalBlurMethod="dimezisBlurView"
        />
      )}
      {/* Semi-transparent overlay for consistent look on both platforms */}
      {Platform.OS === 'ios' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(255,255,255,${opacity})`, borderRadius },
          ]}
        />
      )}
      {/* Content */}
      <View style={noPadding ? undefined : styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    padding: 14,
  },
});
