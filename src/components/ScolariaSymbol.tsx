/**
 * ScolariaSymbol — symbole identitaire (couronne 8 ellipses).
 * Indigo #4338CA par défaut ; blanc possible sur fond coloré.
 *
 * `entrance="assemble"` : chaque ellipse tourne depuis un angle de départ puis
 * se verrouille en place (spring), dans un groupe global animé.
 */

import React, { useEffect } from 'react';
import Svg, { Ellipse, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

export interface ScolariaSymbolProps {
  size?: number;
  color?: string;
  /**
   * none — rendu statique.
   * assemble — entrée : ellipses en rotation décalée puis ressort.
   */
  entrance?: 'none' | 'assemble';
}

const LARGE_ANGLES = [8, 98, 188, 278] as const;
const SMALL_ANGLES = [53, 143, 233, 323] as const;

const LARGE_RX = 10;
const LARGE_RY = 20;
const LARGE_CY = -66;
const SMALL_RX = 8;
const SMALL_RY = 14;
const SMALL_CY = -62;

const STAGGER_MS = 48;
const SWIRL = 200;
const OUTER_FROM = -48;
const OUTER_TO = 22.5;
const springBase = { damping: 16, stiffness: 88, mass: 0.5 } as const;
const springOuter = { damping: 15, stiffness: 72, mass: 0.55 } as const;

type Ring = { angle: number; rx: number; ry: number; cy: number; key: string };

const RINGS: Ring[] = [
  ...LARGE_ANGLES.map((angle) => ({
    angle,
    rx: LARGE_RX,
    ry: LARGE_RY,
    cy: LARGE_CY,
    key: `L-${angle}`,
  })),
  ...SMALL_ANGLES.map((angle) => ({
    angle,
    rx: SMALL_RX,
    ry: SMALL_RY,
    cy: SMALL_CY,
    key: `S-${angle}`,
  })),
];

function PetalG({
  targetAngle,
  index,
  rx,
  ry,
  cy,
  fill,
}: {
  targetAngle: number;
  index: number;
  rx: number;
  ry: number;
  cy: number;
  fill: string;
}) {
  const r = useSharedValue(targetAngle - SWIRL);

  useEffect(() => {
    r.value = withDelay(
      80 + index * STAGGER_MS,
      withSpring(targetAngle, springBase),
    );
  }, [index, r, targetAngle]);

  // Android: `rotation` + origin sur <G> ne se met pas à jour via Reanimated — utiliser `transform` (RN).
  const ap = useAnimatedProps(() => ({
    transform: [{ rotate: `${r.value}deg` }],
  }));

  return (
    <AnimatedG animatedProps={ap}>
      <Ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={fill} />
    </AnimatedG>
  );
}

function CrownAssemble({ color }: { color: string }) {
  const outer = useSharedValue(OUTER_FROM);

  useEffect(() => {
    outer.value = withDelay(30, withSpring(OUTER_TO, springOuter));
  }, [outer]);

  const outerAp = useAnimatedProps(() => ({
    transform: [{ rotate: `${outer.value}deg` }],
  }));

  return (
    <AnimatedG animatedProps={outerAp}>
      {RINGS.map((ring, i) => (
        <PetalG
          key={ring.key}
          targetAngle={ring.angle}
          index={i}
          rx={ring.rx}
          ry={ring.ry}
          cy={ring.cy}
          fill={color}
        />
      ))}
    </AnimatedG>
  );
}

function CrownStatic({ color }: { color: string }) {
  return (
    <G rotation={OUTER_TO} originX={0} originY={0}>
      {RINGS.map((ring) => (
        <G key={ring.key} rotation={ring.angle} originX={0} originY={0}>
          <Ellipse cx={0} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill={color} />
        </G>
      ))}
    </G>
  );
}

export default function ScolariaSymbol({
  size = 48,
  color = '#4338CA',
  entrance = 'none',
}: ScolariaSymbolProps) {
  return (
    <Svg width={size} height={size} viewBox="-100 -100 200 200">
      {entrance === 'assemble' ? (
        <CrownAssemble color={color} />
      ) : (
        <CrownStatic color={color} />
      )}
    </Svg>
  );
}
