/**
 * SplashScreen — Épure totale.
 *
 * Logo seul, centré. Halos très doux. Un point pulsant en bas.
 * Transition seamless vers LoginScreen.
 */

import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoScolaria from '../components/LogoScolaria';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(16)).current;
  const dotOpacity     = useRef(new Animated.Value(0)).current;
  const dotScale       = useRef(new Animated.Value(0.8)).current;
  const screenFadeOut  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo fade-in
    Animated.parallel([
      Animated.timing(logoOpacity,    { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(logoTranslateY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Dot appears 400ms after, then pulses
    setTimeout(() => {
      Animated.timing(dotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
          Animated.timing(dotScale, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }, 400);

    // Hold → fade out
    const timer = setTimeout(() => {
      Animated.timing(screenFadeOut, { toValue: 0, duration: 380, useNativeDriver: true })
        .start(() => onFinish());
    }, 1800);

    const fallback = setTimeout(() => onFinish(), 4200);
    return () => { clearTimeout(timer); clearTimeout(fallback); };
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: screenFadeOut }]}>
      <LinearGradient colors={['#0B1628', '#162240']} style={StyleSheet.absoluteFill} />

      {/* Halos — très discrets */}
      <View style={s.haloViolet} />
      <View style={s.haloCyan} />

      {/* Logo */}
      <Animated.View
        style={[s.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}
      >
        <LogoScolaria size={52} variant="dark" />
      </Animated.View>

      {/* Dot pulsant */}
      <Animated.View
        style={[s.dotWrap, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]}
      >
        <View style={s.dot} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  haloViolet: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(139,92,246,0.07)',
    top: -110,
    right: -110,
  },
  haloCyan: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6,182,212,0.05)',
    bottom: 60,
    left: -90,
  },

  logoWrap: { alignItems: 'center' },

  dotWrap: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(34,211,238,0.55)',
  },
});
