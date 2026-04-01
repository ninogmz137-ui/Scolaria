/**
 * LuminousOrbs — Floating blurred luminous circles for dark backgrounds.
 *
 * 3-4 orbs with looping position animations, used on splash and login screens.
 * Colors: violet (#6366F1), cyan (#22D3EE), lavender (#A78BFA).
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, Dimensions, StyleSheet } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

interface OrbConfig {
  color: string;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  duration: number;
  opacity: number;
}

const ORBS: OrbConfig[] = [
  { color: '#6366F1', size: SW * 0.7, x: -SW * 0.15, y: -SH * 0.05, dx: SW * 0.08, dy: SH * 0.04, duration: 6000, opacity: 0.08 },
  { color: '#22D3EE', size: SW * 0.55, x: SW * 0.4, y: SH * 0.55, dx: -SW * 0.06, dy: -SH * 0.05, duration: 7500, opacity: 0.06 },
  { color: '#A78BFA', size: SW * 0.45, x: SW * 0.6, y: SH * 0.15, dx: -SW * 0.04, dy: SH * 0.06, duration: 8000, opacity: 0.07 },
  { color: '#6366F1', size: SW * 0.35, x: -SW * 0.1, y: SH * 0.7, dx: SW * 0.05, dy: -SH * 0.03, duration: 9000, opacity: 0.05 },
];

export default function LuminousOrbs() {
  const anims = useRef(ORBS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: ORBS[i].duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: ORBS[i].duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <>
      {ORBS.map((orb, i) => {
        const translateX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, orb.dx] });
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, orb.dy] });

        return (
          <Animated.View
            key={i}
            style={[
              styles.orb,
              {
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                backgroundColor: orb.color,
                opacity: orb.opacity,
                left: orb.x,
                top: orb.y,
                transform: [{ translateX }, { translateY }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
