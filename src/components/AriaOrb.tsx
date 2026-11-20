/**
 * AriaOrb — Le symbole couronne ScolariaSymbol EST l'identité Aria.
 *
 * Pas de core blanc / ✦ bubble : la couronne 8-ellipses est l'avatar à part entière.
 * Rotation vectorielle via AnimatedG (pas Animated.View) → rendu net, pas de blur.
 * Scale heartbeat via Animated.View wrapper (blurriness négligeable vs rotation).
 *
 * États :
 *   idle     — rotation lente (20 s/tour) + micro-breathe scale (1.0 → 1.05)
 *   listening — rotation medium (8 s/tour) + breathe ample (1.0 → 1.12)
 *   thinking  — rotation medium (8 s/tour) + heartbeat (1.0 → 1.35 → 0.95 → 1.0 → pause)
 */

import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { G } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ARIA_INDIGO } from '../constants/theme';
import ScolariaSymbol, { CrownShapes, COMPACT_BELOW } from './ScolariaSymbol';

const AnimatedG = Animated.createAnimatedComponent(G);

// Géométrie de la couronne : CrownShapes (ScolariaSymbol), source unique.

export type AriaOrbState = 'idle' | 'listening' | 'thinking';

type Props = {
  state: AriaOrbState;
  holeColor?: string; // kept for API compat
  color?: string;     // fill color for bubble variant (defaults to ARIA_INDIGO)
  style?: ViewStyle;
  variant?: 'default' | 'bubble';
  size?: number;
};

// ─── Crown SVG with internal animated rotation ───────────
/**
 * CrownAnimated — SVG crown where rotation is driven by AnimatedG
 * (stays in SVG vector space → no rasterisation blur).
 * The outer Animated.View wrapper handles scale only.
 */
function CrownAnimated({
  size,
  color,
  rotDeg,
}: {
  size: number;
  color: string;
  rotDeg: SharedValue<number>;
}) {
  const rotProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotDeg.value}deg` }],
  }));

  return (
    <Svg width={size} height={size} viewBox="-100 -100 200 200">
      {/* Animated outer group — rotation in SVG space, stays crisp */}
      <AnimatedG animatedProps={rotProps}>
        <CrownShapes color={color} compact={size < COMPACT_BELOW} />
      </AnimatedG>
    </Svg>
  );
}

// ─── Bubble variant (static, taille configurable) ────────
function AriaOrbBubble({
  size = 32,
  color = ARIA_INDIGO,
  style,
}: {
  size?: number;
  color?: string;
  holeColor?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      <ScolariaSymbol size={size} color={color} />
    </View>
  );
}

// ─── Default (animated) orb ──────────────────────────────
function AriaOrbDefault({ state, style, size = 80 }: Omit<Props, 'variant'>) {
  const rotDeg = useSharedValue(0);
  const scale  = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(rotDeg);
    cancelAnimation(scale);

    if (state === 'idle') {
      // Slow, meditative rotation + barely-there breathe
      rotDeg.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1, false,
      );
      scale.value = withRepeat(
        withTiming(1.05, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }

    if (state === 'listening') {
      // Slightly faster, broader breathe
      rotDeg.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1, false,
      );
      scale.value = withRepeat(
        withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }

    if (state === 'thinking') {
      // Medium rotation + heartbeat: quick expand → undershoot → settle → pause
      rotDeg.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1, false,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 180, easing: Easing.out(Easing.quad) }), // boom
          withTiming(0.92, { duration: 380, easing: Easing.in(Easing.ease) }),   // contract
          withTiming(1.0,  { duration: 220, easing: Easing.out(Easing.ease) }),  // settle
          withTiming(1.0,  { duration: 900 }),                                    // beat pause
        ),
        -1, false,
      );
    }

    return () => {
      cancelAnimation(rotDeg);
      cancelAnimation(scale);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, scaleStyle, style]}>
      <CrownAnimated size={size} color={ARIA_INDIGO} rotDeg={rotDeg} />
    </Animated.View>
  );
}

// ─── Public export ────────────────────────────────────────
export default function AriaOrb(props: Props) {
  if (props.variant === 'bubble') {
    return (
      <AriaOrbBubble
        size={props.size ?? 32}
        color={props.color ?? ARIA_INDIGO}
        style={props.style}
      />
    );
  }
  return (
    <AriaOrbDefault
      state={props.state}
      holeColor={props.holeColor}
      style={props.style}
      size={props.size ?? 80}
    />
  );
}
