/**
 * AriaSparkleIcon — Gradient circle with 3 "✦" text sparkles.
 *
 * Simple approach: 3 Text "✦" characters in white, different sizes,
 * positioned as a compact asymmetric group inside a LinearGradient circle.
 *
 * Usage:
 *   <AriaSparkleIcon size={40} />            — standard (topbar, messagerie)
 *   <AriaSparkleIcon size={32} />            — chat avatar
 *   <AriaSparkleIcon size={22} />            — inline label
 *   <AriaSparkleIcon size={40} noGradient /> — sparkles only (no circle)
 */

import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Main component ─────────────────────────────────────

interface Props {
  /** Circle diameter in px. Default 40. */
  size?: number;
  /** Skip the gradient background — render sparkles only. */
  noGradient?: boolean;
  /** Render sparkles in gradient violet→cyan color instead of white (for glass backgrounds). */
  gradientSparkles?: boolean;
}

export default function AriaSparkleIcon({ size = 40, noGradient, gradientSparkles }: Props) {
  const s = size;
  const half = s / 2;

  // Sparkle font sizes scale proportionally
  const bigSize    = Math.round(s * 0.40);   // 16px at size=40
  const medSize    = Math.round(s * 0.25);   // 10px at size=40
  const smallSize  = Math.round(s * 0.175);  //  7px at size=40

  const sparkleStyle = gradientSparkles ? styles.sparkleGradient : styles.sparkle;

  const sparkles = (
    <>
      {/* Big sparkle — center-left */}
      <Text
        style={[
          sparkleStyle,
          {
            fontSize: bigSize,
            top: half - bigSize * 0.55,
            left: half - bigSize * 0.7,
          },
        ]}
      >
        ✦
      </Text>
      {/* Medium sparkle — top-right */}
      <Text
        style={[
          sparkleStyle,
          {
            fontSize: medSize,
            top: half - medSize * 0.5 - s * 0.28,
            left: half + s * 0.08,
          },
        ]}
      >
        ✦
      </Text>
      {/* Small sparkle — bottom-right */}
      <Text
        style={[
          sparkleStyle,
          {
            fontSize: smallSize,
            top: half + s * 0.12,
            left: half + s * 0.10,
          },
        ]}
      >
        ✦
      </Text>
    </>
  );

  if (noGradient) {
    return (
      <View style={{ width: s, height: s }}>
        {sparkles}
      </View>
    );
  }

  return (
    <View style={{ width: s, height: s, borderRadius: half, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#8B5CF6', '#06B6D4']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {sparkles}
    </View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    color: '#FFFFFF',
    lineHeight: undefined,
  },
  sparkleGradient: {
    position: 'absolute',
    color: '#7C3AED',
    lineHeight: undefined,
  },
});
