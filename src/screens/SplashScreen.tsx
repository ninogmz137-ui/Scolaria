/**
 * SplashScreen — Cinematic entrance with luminous orbs and progressive logo.
 *
 * Background: dark navy #1A2340 with floating LuminousOrbs.
 * Sequence: logo spring → orbit ring → tagline slide → loading dots → fade out.
 */

import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LuminousOrbs from '../components/LuminousOrbs';
import LogoScolariaSvg from '../components/LogoScolariaSvg';
import { FontFamily } from '../hooks/useSolariaFonts';

const DARK_BG = '#1A2340';
const VIOLET = '#6366F1';
const CYAN = '#22D3EE';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const orbitScale = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const dotOpacity1 = useRef(new Animated.Value(0)).current;
  const dotOpacity2 = useRef(new Animated.Value(0)).current;
  const dotOpacity3 = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous orbit rotation (fire-and-forget)
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true,
      }),
    ).start();

    // Main sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(orbitScale, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.stagger(200, [
        Animated.timing(dotOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());

    const fallback = setTimeout(() => onFinish(), 4000);
    return () => clearTimeout(fallback);
  }, []);

  const spin = orbitRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[s.root, { opacity: fadeOut }]}>
      <View style={s.bg}>
        {/* Luminous orbs background */}
        <LuminousOrbs />

        {/* Logo container */}
        <Animated.View style={[s.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          {/* Orbit ring */}
          <Animated.View style={[s.orbitWrap, { transform: [{ rotate: spin }, { scale: orbitScale }] }]}>
            <View style={s.orbitRing} />
            <LinearGradient colors={[CYAN, VIOLET]} style={s.orbitDot} />
          </Animated.View>
          <LogoScolariaSvg width={80} variant="dark" iconOnly />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[s.taglineWrap, { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] }]}>
          <View style={s.brandRow}>
            <Text style={s.brandScolar}>Scolar</Text>
            <Text style={s.brandIa}>ia</Text>
            <Text style={s.brandStar}>✦</Text>
          </View>
          <Text style={s.tagline}>Le copilote éducatif des familles</Text>
          <View style={s.separator} />
          <Text style={s.subtitle}>pour les familles fran&#231;aises</Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={s.dotsRow}>
          <Animated.View style={[s.dot, { opacity: dotOpacity1, backgroundColor: VIOLET }]} />
          <Animated.View style={[s.dot, { opacity: dotOpacity2, backgroundColor: CYAN }]} />
          <Animated.View style={[s.dot, { opacity: dotOpacity3, backgroundColor: VIOLET }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  bg: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  orbitWrap: { position: 'absolute', width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  orbitRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 1.5, borderColor: 'rgba(109,40,217,0.25)', borderStyle: 'dashed' },
  orbitDot: { position: 'absolute', top: 10, width: 12, height: 12, borderRadius: 6, overflow: 'hidden' },
  taglineWrap: { alignItems: 'center', marginBottom: 60 },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  brandScolar: { fontFamily: FontFamily.loraBold, fontSize: 38, color: '#FFFFFF', letterSpacing: -0.3 },
  brandIa: { fontFamily: FontFamily.sansMedium, fontSize: 38, color: CYAN, letterSpacing: 0.3 },
  brandStar: { fontSize: 12, color: CYAN, marginLeft: 3, marginBottom: 14 },
  tagline: { fontFamily: FontFamily.sansSemiBold, fontSize: 16, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  separator: { width: 40, height: 2, backgroundColor: VIOLET, marginVertical: 12, borderRadius: 1 },
  subtitle: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
