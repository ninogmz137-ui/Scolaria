/**
 * Custom animated splash screen with Scolaria logo
 * and orbital animation around the "ia" suffix.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, Dimensions } from 'react-native';
import { Box, Text } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import LogoScolariaSvg from '../components/LogoScolariaSvg';
import { FontFamily } from '../hooks/useSolariaFonts';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  // Animations
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
    // Sequence: logo appears → orbit starts → tagline slides in → fade out
    Animated.sequence([
      // 1. Logo appears with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 2. Orbit appears and starts spinning
      Animated.parallel([
        Animated.timing(orbitScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        // Tagline slides in
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // 3. Loading dots
      Animated.stagger(200, [
        Animated.timing(dotOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dotOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),

      // 4. Hold
      Animated.delay(800),

      // 5. Fade out
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());

    // Fallback: if animations don't complete (e.g. on web), force finish after 4s
    const fallback = setTimeout(() => onFinish(), 4000);
    return () => clearTimeout(fallback);

    // Continuous orbit rotation
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, opacity: fadeOut }}>
      <LinearGradient
        colors={[Colors.blueNight, '#0D1235', Colors.blueNight]}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        {/* Background particles */}
        <Box className="absolute top-0 left-0 right-0 bottom-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <Box
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * 90 + 5}%`,
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                opacity: Math.random() * 0.4 + 0.1,
                backgroundColor: Colors.cyan,
              }}
            />
          ))}
        </Box>

        {/* Logo container */}
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }}
        >
          {/* Orbit ring */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ rotate: spin }, { scale: orbitScale }],
            }}
          >
            <Box
              className="rounded-full"
              style={{
                width: 160,
                height: 160,
                borderWidth: 1.5,
                borderColor: 'rgba(109,40,217,0.25)',
                borderStyle: 'dashed',
              }}
            />
            {/* Orbiting dot */}
            <Box className="absolute overflow-hidden" style={{ top: 10, width: 12, height: 12, borderRadius: 6 }}>
              <LinearGradient
                colors={[Colors.cyan, Colors.violet]}
                style={{ flex: 1 }}
              />
            </Box>
          </Animated.View>

          {/* Logo SVG icon */}
          <LogoScolariaSvg width={80} variant="dark" iconOnly />
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginBottom: 60,
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          {/* Brand name under icon */}
          <Box className="flex-row items-baseline mb-3">
            <Text style={{ fontFamily: FontFamily.loraBold, fontSize: 38, color: '#FFFFFF', letterSpacing: -0.3 }}>
              Scolar
            </Text>
            <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 38, color: Colors.cyan, letterSpacing: 0.3 }}>
              ia
            </Text>
            <Text style={{ fontSize: 12, color: Colors.cyan, marginLeft: 3, marginBottom: 14 }}>
              ✦
            </Text>
          </Box>
          <Text
            className="text-base font-semibold"
            style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 }}
          >
            Le copilote éducatif des familles
          </Text>
          <Box
            className="rounded-sm"
            style={{
              width: 40,
              height: 2,
              backgroundColor: Colors.violet,
              marginVertical: 12,
            }}
          />
          <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            pour les familles fran&#231;aises
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <Box className="flex-row" style={{ gap: 8 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, opacity: dotOpacity1, backgroundColor: Colors.violet }} />
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, opacity: dotOpacity2, backgroundColor: Colors.cyan }} />
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, opacity: dotOpacity3, backgroundColor: Colors.violet }} />
        </Box>
      </LinearGradient>
    </Animated.View>
  );
}
