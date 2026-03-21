/**
 * Custom animated splash screen with Scolaria logo
 * and orbital animation around the "ia" suffix.
 */

import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

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
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient
        colors={[Colors.blueNight, '#0D1235', Colors.blueNight]}
        style={styles.gradient}
      >
        {/* Background particles */}
        <View style={styles.particles}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${Math.random() * 90 + 5}%`,
                  top: `${Math.random() * 90 + 5}%`,
                  width: Math.random() * 3 + 1,
                  height: Math.random() * 3 + 1,
                  opacity: Math.random() * 0.4 + 0.1,
                },
              ]}
            />
          ))}
        </View>

        {/* Logo container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          {/* Orbit ring */}
          <Animated.View
            style={[
              styles.orbitContainer,
              {
                transform: [{ rotate: spin }, { scale: orbitScale }],
              },
            ]}
          >
            <View style={styles.orbitRing} />
            {/* Orbiting dot */}
            <View style={styles.orbitDot}>
              <LinearGradient
                colors={[Colors.cyan, Colors.violet]}
                style={styles.orbitDotGradient}
              />
            </View>
          </Animated.View>

          {/* Logo text */}
          <View style={styles.logoTextRow}>
            <Text style={styles.logoPrefix}>Scolar</Text>
            <View style={styles.iaContainer}>
              <Text style={styles.logoIa}>ia</Text>
            </View>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>Passeport scolaire numérique</Text>
          <View style={styles.taglineLine} />
          <Text style={styles.taglineSub}>pour les familles françaises</Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dotOpacity1, backgroundColor: Colors.violet }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity2, backgroundColor: Colors.cyan }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity3, backgroundColor: Colors.violet }]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Particles
  particles: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: Colors.cyan,
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoPrefix: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  iaContainer: {
    position: 'relative',
  },
  logoIa: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 1,
  },
  // Orbit
  orbitContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(109,40,217,0.25)',
    borderStyle: 'dashed',
  },
  orbitDot: {
    position: 'absolute',
    top: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  orbitDotGradient: {
    flex: 1,
  },
  // Tagline
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  taglineLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.violet,
    marginVertical: 12,
    borderRadius: 1,
  },
  taglineSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  // Loading dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
