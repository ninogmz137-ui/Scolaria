/**
 * AriaSparkleIcon — Gradient circle with 3 four-pointed sparkle shapes.
 *
 * Replaces the old ✦ text character with proper View-based sparkles
 * for a premium, dynamic look.
 *
 * Usage:
 *   <AriaSparkleIcon size={40} />            — standard (topbar, messagerie)
 *   <AriaSparkleIcon size={32} />            — chat avatar
 *   <AriaSparkleIcon size={22} />            — inline label
 *   <AriaSparkleIcon size={40} noGradient /> — sparkles only (no circle)
 */

import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Four-pointed sparkle built from two crossed rectangles ─

function Sparkle({ size, color }: { size: number; color: string }) {
  // Vertical branch: full height, narrow width
  const vWidth = Math.max(1.5, size * 0.18);
  const vHeight = size;
  // Horizontal branch: full width, narrow height — shorter than vertical for asymmetric star
  const hWidth = size * 0.65;
  const hHeight = Math.max(1.5, size * 0.18);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Vertical bar — tall and thin, tapers to points */}
      <View
        style={{
          position: 'absolute',
          width: vWidth,
          height: vHeight,
          backgroundColor: color,
          borderRadius: vWidth / 2,
        }}
      />
      {/* Horizontal bar — shorter and thin */}
      <View
        style={{
          position: 'absolute',
          width: hWidth,
          height: hHeight,
          backgroundColor: color,
          borderRadius: hHeight / 2,
        }}
      />
    </View>
  );
}

// ─── Main component ─────────────────────────────────────

interface Props {
  /** Circle diameter in px. Default 40. */
  size?: number;
  /** Skip the gradient background — render sparkles only. */
  noGradient?: boolean;
}

export default function AriaSparkleIcon({ size = 40, noGradient }: Props) {
  const s = size; // alias for brevity
  const half = s / 2;

  // Sparkle sizes scale proportionally to container
  const big    = s * 0.35;   // 14px at size=40
  const medium = s * 0.225;  //  9px at size=40
  const small  = s * 0.13;   //  5px at size=40

  // Positions (from center of circle, in px offsets)
  // Asymmetric triangle: big center-left, medium top-right, small bottom-right
  const sparkles = (
    <>
      {/* Big sparkle — center-left */}
      <View style={[styles.sparklePos, { top: half - big / 2 - s * 0.02, left: half - big / 2 - s * 0.15 }]}>
        <Sparkle size={big} color="#FFFFFF" />
      </View>
      {/* Medium sparkle — top-right */}
      <View style={[styles.sparklePos, { top: half - medium / 2 - s * 0.22, left: half - medium / 2 + s * 0.18 }]}>
        <Sparkle size={medium} color="#FFFFFF" />
      </View>
      {/* Small sparkle — bottom-right */}
      <View style={[styles.sparklePos, { top: half - small / 2 + s * 0.22, left: half - small / 2 + s * 0.20 }]}>
        <Sparkle size={small} color="#FFFFFF" />
      </View>
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
  sparklePos: {
    position: 'absolute',
  },
});
