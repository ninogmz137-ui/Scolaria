/**
 * SplashScreen — Cinematic entrance.
 *
 * Same dark gradient + halos as login for seamless transition.
 * Logo "Scolar" white + "ia" cyan + sparkle, fade-in with translateY.
 * Tagline appears 200ms after logo. ActivityIndicator at bottom.
 */

import { useEffect, useRef } from 'react';
import { View, Text, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../hooks/useSolariaFonts';

const CYAN = '#22D3EE';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo fade in + slide up
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      // Tagline 200ms after
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Hold then fade out
      Animated.delay(1000),
      Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());

    const fallback = setTimeout(() => onFinish(), 4000);
    return () => clearTimeout(fallback);
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: fadeOut }]}>
      <View style={s.bg}>
        <LinearGradient colors={['#0B1628', '#162240']} style={StyleSheet.absoluteFill} />

        {/* Halos */}
        <View style={s.haloViolet} />
        <View style={s.haloCyan} />

        {/* Logo */}
        <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}>
          <Text style={s.logoText}>
            Scolar<Text style={s.logoCyan}>ia</Text>
            <Text style={s.sparkle}>✦</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] }}>
          <Text style={s.tagline}>Le copilote éducatif des familles</Text>
        </Animated.View>

        {/* Loader */}
        <View style={s.loaderWrap}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  bg: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

  haloViolet: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: -60,
    right: -80,
    opacity: 0.8,
  },
  haloCyan: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(6,182,212,0.08)',
    bottom: 120,
    left: -60,
    opacity: 0.7,
  },

  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logoText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 52,
    color: '#FFFFFF',
  },
  logoCyan: {
    color: CYAN,
  },
  sparkle: {
    fontSize: 18,
    color: CYAN,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 60,
  },
});
