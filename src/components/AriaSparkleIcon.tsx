/**
 * AriaSparkleIcon — Gradient circle with 3 "✦" text sparkles.
 *
 * Uses CSS backgroundImage on web (LinearGradient doesn't render on web),
 * and expo-linear-gradient on native.
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Shared gradient wrapper (web fallback) ─────────────

function GradientCircle({
  size,
  borderRadius,
  children,
}: {
  size: number;
  borderRadius: number;
  children: React.ReactNode;
}) {
  const base = {
    width: size,
    height: size,
    borderRadius,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          ...base,
          // @ts-ignore — web-only CSS property
          backgroundImage: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
        }}
      >
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#7C3AED', '#06B6D4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={base}
    >
      {children}
    </LinearGradient>
  );
}

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
  const bigSize    = Math.round(s * 0.40);
  const medSize    = Math.round(s * 0.25);
  const smallSize  = Math.round(s * 0.175);

  const sparkleStyle = gradientSparkles ? styles.sparkleGradient : styles.sparkle;

  const sparkles = (
    <>
      <Text
        style={[sparkleStyle, { fontSize: bigSize, top: half - bigSize * 0.55, left: half - bigSize * 0.7 }]}
      >
        ✦
      </Text>
      <Text
        style={[sparkleStyle, { fontSize: medSize, top: half - medSize * 0.5 - s * 0.28, left: half + s * 0.08 }]}
      >
        ✦
      </Text>
      <Text
        style={[sparkleStyle, { fontSize: smallSize, top: half + s * 0.12, left: half + s * 0.10 }]}
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
    <GradientCircle size={s} borderRadius={half}>
      {sparkles}
    </GradientCircle>
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
