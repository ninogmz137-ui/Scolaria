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
import { type ViewStyle } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
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

const AnimatedG = Animated.createAnimatedComponent(G);

// ─── Crown geometry — identical to ScolariaSymbol ────────
const LARGE_ANGLES = [8, 98, 188, 278] as const;
const SMALL_ANGLES = [53, 143, 233, 323] as const;
const LARGE_RX = 10;
const LARGE_RY = 20;
const LARGE_CY = -66;
const SMALL_RX = 8;
const SMALL_RY = 14;
const SMALL_CY = -62;
const OUTER_TILT = 22.5;

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
        {/* Fixed tilt matching ScolariaSymbol's OUTER_TO=22.5 */}
        <G rotation={OUTER_TILT} originX={0} originY={0}>
          {LARGE_ANGLES.map((angle) => (
            <G key={`L${angle}`} rotation={angle} originX={0} originY={0}>
              <Ellipse cx={0} cy={LARGE_CY} rx={LARGE_RX} ry={LARGE_RY} fill={color} />
            </G>
          ))}
          {SMALL_ANGLES.map((angle) => (
            <G key={`S${angle}`} rotation={angle} originX={0} originY={0}>
              <Ellipse cx={0} cy={SMALL_CY} rx={SMALL_RX} ry={SMALL_RY} fill={color} />
            </G>
          ))}
        </G>
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
    <Svg width={size} height={size} viewBox="-100 -100 200 200" style={style}>
      <G rotation={OUTER_TILT} originX={0} originY={0}>
        {LARGE_ANGLES.map((angle) => (
          <G key={`L${angle}`} rotation={angle} originX={0} originY={0}>
            <Ellipse cx={0} cy={LARGE_CY} rx={LARGE_RX} ry={LARGE_RY} fill={color} />
          </G>
        ))}
        {SMALL_ANGLES.map((angle) => (
          <G key={`S${angle}`} rotation={angle} originX={0} originY={0}>
            <Ellipse cx={0} cy={SMALL_CY} rx={SMALL_RX} ry={SMALL_RY} fill={color} />
          </G>
        ))}
      </G>
    </Svg>
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
