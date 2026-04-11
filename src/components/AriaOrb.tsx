import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FontFamily } from '../hooks/useSolariaFonts';

const VIOLET = '#7C3AED';
const CYAN = '#06B6D4';
const CORE = 60;
const CORE_R = 30;

/** Max diameter for thinking waves + padding for shadows */
const CONTAINER = 200;

export type AriaOrbState = 'idle' | 'listening' | 'thinking';

type Props = {
  state: AriaOrbState;
  /** Background visible through ring “holes” (Aria screens use #F2F2F7) */
  holeColor?: string;
  style?: ViewStyle;
};

function GradientRingBorder({
  outer,
  borderW,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  opacity = 1,
  holeColor,
}: {
  outer: number;
  borderW: number;
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  opacity?: number;
  holeColor: string;
}) {
  const inner = outer - borderW * 2;
  const innerR = inner / 2;
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: innerR,
          backgroundColor: holeColor,
        }}
      />
    </LinearGradient>
  );
}

export default function AriaOrb({ state, holeColor = '#F2F2F7', style }: Props) {
  const ring1Pulse = useSharedValue(0);
  const ring2Pulse = useSharedValue(0);
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);
  const wave0 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const thinkingSV = useSharedValue(0);

  // ── Idle: pulse 3s ease-in-out ──
  useEffect(() => {
    if (state !== 'idle') {
      cancelAnimation(ring1Pulse);
      cancelAnimation(ring2Pulse);
      return;
    }
    ring1Pulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    ring2Pulse.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(ring1Pulse);
      cancelAnimation(ring2Pulse);
    };
  }, [state, ring1Pulse, ring2Pulse]);

  const idleRing1Style = useAnimatedStyle(() => {
    const t = ring1Pulse.value;
    const scale = 1 + t * 0.03;
    const o = 0.3 + t * 0.3;
    return { transform: [{ scale }], opacity: o };
  });

  const idleRing2Style = useAnimatedStyle(() => {
    const t = ring2Pulse.value;
    const scale = 1 + t * 0.03;
    const o = 0.12 + t * 0.16;
    return { transform: [{ scale }], opacity: o };
  });

  // ── Listening: rotations ──
  useEffect(() => {
    if (state !== 'listening') {
      cancelAnimation(rot1);
      cancelAnimation(rot2);
      cancelAnimation(rot3);
      rot1.value = 0;
      rot2.value = 0;
      rot3.value = 0;
      return;
    }
    rot1.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );
    rot2.value = withRepeat(
      withTiming(-360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
    rot3.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rot1);
      cancelAnimation(rot2);
      cancelAnimation(rot3);
    };
  }, [state, rot1, rot2, rot3]);

  const listenRing1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot1.value}deg` }],
  }));
  const listenRing2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot2.value}deg` }],
  }));
  const listenRing3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot3.value}deg` }],
  }));

  // ── Thinking: waves + core glow ──
  useEffect(() => {
    if (state !== 'thinking') {
      [wave0, wave1, wave2, wave3].forEach((w) => cancelAnimation(w));
      cancelAnimation(glowPulse);
      wave0.value = 0;
      wave1.value = 0;
      wave2.value = 0;
      wave3.value = 0;
      glowPulse.value = 0;
      return;
    }
    const waveLoop = (delayMs: number) =>
      withDelay(
        delayMs,
        withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
    wave0.value = waveLoop(0);
    wave1.value = waveLoop(500);
    wave2.value = waveLoop(1000);
    wave3.value = waveLoop(1500);
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      [wave0, wave1, wave2, wave3, glowPulse].forEach((w) => cancelAnimation(w));
    };
  }, [state, wave0, wave1, wave2, wave3, glowPulse]);

  useEffect(() => {
    thinkingSV.value = state === 'thinking' ? 1 : 0;
  }, [state, thinkingSV]);

  const wave0Style = useAnimatedStyle(() => {
    const t = wave0.value;
    return { transform: [{ scale: 1 + t }], opacity: 1 - t };
  });
  const wave1Style = useAnimatedStyle(() => {
    const t = wave1.value;
    return { transform: [{ scale: 1 + t }], opacity: 1 - t };
  });
  const wave2Style = useAnimatedStyle(() => {
    const t = wave2.value;
    return { transform: [{ scale: 1 + t }], opacity: 1 - t };
  });
  const wave3Style = useAnimatedStyle(() => {
    const t = wave3.value;
    return { transform: [{ scale: 1 + t }], opacity: 1 - t };
  });

  const coreShadowStyle = useAnimatedStyle(() => {
    if (thinkingSV.value > 0.5) {
      const t = glowPulse.value;
      return {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4 * (1 - t),
        shadowRadius: 8 * t,
      };
    }
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    };
  });

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.stage}>
        {/* Idle */}
        {state === 'idle' && (
          <>
            <Animated.View style={[styles.ringAbs, idleRing1Style]} pointerEvents="none">
              <GradientRingBorder
                outer={80}
                borderW={2}
                colors={[VIOLET, CYAN]}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, idleRing2Style]} pointerEvents="none">
              <GradientRingBorder
                outer={96}
                borderW={1.5}
                colors={[VIOLET, CYAN]}
                holeColor={holeColor}
              />
            </Animated.View>
          </>
        )}

        {/* Listening */}
        {state === 'listening' && (
          <>
            <Animated.View style={[styles.ringAbs, listenRing1Style]} pointerEvents="none">
              <GradientRingBorder
                outer={80}
                borderW={2.5}
                colors={[VIOLET, CYAN]}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, listenRing2Style]} pointerEvents="none">
              <GradientRingBorder
                outer={98}
                borderW={1.5}
                colors={[CYAN, VIOLET]}
                opacity={0.5}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, listenRing3Style]} pointerEvents="none">
              <GradientRingBorder
                outer={116}
                borderW={1}
                colors={[VIOLET, CYAN, VIOLET]}
                opacity={0.3}
                holeColor={holeColor}
              />
            </Animated.View>
          </>
        )}

        {/* Thinking waves */}
        {state === 'thinking' && (
          <>
            <Animated.View style={[styles.ringAbs, wave0Style]} pointerEvents="none">
              <GradientRingBorder outer={80} borderW={1.5} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave1Style]} pointerEvents="none">
              <GradientRingBorder outer={80} borderW={1.5} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave2Style]} pointerEvents="none">
              <GradientRingBorder outer={80} borderW={1.5} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave3Style]} pointerEvents="none">
              <GradientRingBorder outer={80} borderW={1.5} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
          </>
        )}

        {/* Core */}
        <Animated.View style={[styles.core, coreShadowStyle]}>
          <MaskedView
            style={styles.mask}
            maskElement={
              <Text style={styles.sparkleMask} allowFontScaling={false}>
                ✦
              </Text>
            }
          >
            <LinearGradient
              colors={[VIOLET, CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              <Text style={styles.sparkleHidden} allowFontScaling={false}>
                ✦
              </Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringAbs: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE_R,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  mask: {
    width: CORE,
    height: CORE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleMask: {
    fontFamily: FontFamily.sansBold,
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 28,
    backgroundColor: 'transparent',
    color: '#000000',
  },
  gradientFill: {
    width: CORE,
    height: CORE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleHidden: {
    fontFamily: FontFamily.sansBold,
    fontSize: 24,
    opacity: 0,
  },
});
