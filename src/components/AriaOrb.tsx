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
import { SCREEN_BACKGROUND } from '../constants/colors';

const VIOLET = '#7C3AED';
const CYAN = '#06B6D4';
const CORE = 60;

/** Design reference width/height; `size` prop scales from this */
const REF_SIZE = 200;

export type AriaOrbState = 'idle' | 'listening' | 'thinking';

type Props = {
  state: AriaOrbState;
  /** Background visible through ring “holes” (Aria screens use #F2F2F7) */
  holeColor?: string;
  style?: ViewStyle;
  /** 32px idle orb: white core + gradient ✦ + subtle ring (for message avatars) */
  variant?: 'default' | 'bubble';
  /**
   * Outer layout size (width & height) in px — scales all orb geometry without parent `transform`.
   * Default 200 (design reference).
   */
  size?: number;
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

const BUBBLE = 32;
const BUBBLE_CORE_SZ = 20;
const BUBBLE_CORE_R = 10;

/** Small idle orb for chat avatars — does not use Reanimated (state is always idle look). */
function AriaOrbBubble({ holeColor = '#F2F2F7', style }: { holeColor?: string; style?: ViewStyle }) {
  return (
    <View style={[{ width: BUBBLE, height: BUBBLE, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <GradientRingBorder
          outer={BUBBLE}
          borderW={1}
          colors={[VIOLET, CYAN]}
          holeColor={holeColor}
          opacity={0.42}
        />
      </View>
      <View
        style={{
          width: BUBBLE_CORE_SZ,
          height: BUBBLE_CORE_SZ,
          borderRadius: BUBBLE_CORE_R,
          backgroundColor: SCREEN_BACKGROUND,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          ...Platform.select({
            ios: {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            },
            android: { elevation: 2 },
            default: {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            },
          }),
        }}
      >
        {Platform.OS === 'web' ? (
          <Text allowFontScaling={false} style={bubbleStyles.sparkleWeb}>
            ✦
          </Text>
        ) : (
          <MaskedView
            style={bubbleStyles.mask}
            collapsable={false}
            maskElement={
              <View style={bubbleStyles.maskInner}>
                <Text style={bubbleStyles.sparkleMask} allowFontScaling={false}>
                  ✦
                </Text>
              </View>
            }
          >
            <LinearGradient
              colors={[VIOLET, CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={bubbleStyles.gradientFill}
            />
          </MaskedView>
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  mask: {
    width: BUBBLE_CORE_SZ,
    height: BUBBLE_CORE_SZ,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskInner: {
    width: BUBBLE_CORE_SZ,
    height: BUBBLE_CORE_SZ,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sparkleMask: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  gradientFill: {
    width: BUBBLE_CORE_SZ,
    height: BUBBLE_CORE_SZ,
  },
  sparkleWeb: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
    color: VIOLET,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } as const)
      : {}),
  },
});

function AriaOrbDefault({
  state,
  holeColor = '#F2F2F7',
  style,
  size = REF_SIZE,
}: Omit<Props, 'variant'>) {
  const s = size / REF_SIZE;
  const container = size;
  const coreSz = CORE * s;
  const coreRad = coreSz / 2;
  const o = {
    idle1: 80 * s,
    idle2: 96 * s,
    l1: 80 * s,
    l2: 98 * s,
    l3: 116 * s,
    wave: 80 * s,
  };
  const bw = {
    i1: 2 * s,
    i2: 1.5 * s,
    l1: 2.5 * s,
    l2: 1.5 * s,
    l3: 1 * s,
    w: 1.5 * s,
  };
  const fs = 24 * s;
  const lh = 28 * s;

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
    <View style={[styles.wrap, { width: container, height: container }, style]}>
      <View style={[styles.stage, { width: container, height: container }]}>
        {/* Idle */}
        {state === 'idle' && (
          <>
            <Animated.View style={[styles.ringAbs, idleRing1Style]} pointerEvents="none">
              <GradientRingBorder
                outer={o.idle1}
                borderW={bw.i1}
                colors={[VIOLET, CYAN]}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, idleRing2Style]} pointerEvents="none">
              <GradientRingBorder
                outer={o.idle2}
                borderW={bw.i2}
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
                outer={o.l1}
                borderW={bw.l1}
                colors={[VIOLET, CYAN]}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, listenRing2Style]} pointerEvents="none">
              <GradientRingBorder
                outer={o.l2}
                borderW={bw.l2}
                colors={[CYAN, VIOLET]}
                opacity={0.5}
                holeColor={holeColor}
              />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, listenRing3Style]} pointerEvents="none">
              <GradientRingBorder
                outer={o.l3}
                borderW={bw.l3}
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
              <GradientRingBorder outer={o.wave} borderW={bw.w} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave1Style]} pointerEvents="none">
              <GradientRingBorder outer={o.wave} borderW={bw.w} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave2Style]} pointerEvents="none">
              <GradientRingBorder outer={o.wave} borderW={bw.w} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
            <Animated.View style={[styles.ringAbs, wave3Style]} pointerEvents="none">
              <GradientRingBorder outer={o.wave} borderW={bw.w} colors={[VIOLET, CYAN]} holeColor={holeColor} />
            </Animated.View>
          </>
        )}

        {/* Core — ✦ gradient: native = MaskedView + LinearGradient; web = CSS gradient text (MaskedView often shows wrong color) */}
        <Animated.View
          style={[
            styles.core,
            { width: coreSz, height: coreSz, borderRadius: coreRad },
            coreShadowStyle,
          ]}
        >
          {Platform.OS === 'web' ? (
            <Text allowFontScaling={false} style={[styles.sparkleWeb, { fontSize: fs, lineHeight: lh }]}>
              ✦
            </Text>
          ) : (
            <MaskedView
              style={[styles.mask, { width: coreSz, height: coreSz }]}
              collapsable={false}
              maskElement={
                <View style={[styles.maskInner, { width: coreSz, height: coreSz }]}>
                  <Text style={[styles.sparkleMask, { fontSize: fs, lineHeight: lh }]} allowFontScaling={false}>
                    ✦
                  </Text>
                </View>
              }
            >
              <LinearGradient
                colors={[VIOLET, CYAN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: coreSz, height: coreSz }}
              />
            </MaskedView>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

export default function AriaOrb(props: Props) {
  if (props.variant === 'bubble') {
    return <AriaOrbBubble holeColor={props.holeColor} style={props.style} />;
  }
  return (
    <AriaOrbDefault
      state={props.state}
      holeColor={props.holeColor}
      style={props.style}
      size={props.size ?? REF_SIZE}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringAbs: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    backgroundColor: SCREEN_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  mask: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Ensures mask text is centered; opaque pixels define the mask (never use black — can render as visible black on some targets). */
  maskInner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sparkleMask: {
    fontFamily: FontFamily.sansBold,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  /** Web: same gradient as LinearGradient + MaskedView; solid violet if clip unsupported (never black). */
  sparkleWeb: {
    fontFamily: FontFamily.sansBold,
    textAlign: 'center',
    color: VIOLET,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } as const)
      : {}),
  },
});
