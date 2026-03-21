import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface Props {
  power: string;
  emoji: string;
  description?: string;
}

export default function SuperPowerBadge({ power, emoji, description }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Orbit rotation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Core pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Orbit ring */}
      <Animated.View
        style={[styles.orbitRing, { transform: [{ rotate: spin }] }]}
      >
        <View style={styles.orbitDot1} />
        <View style={styles.orbitDot2} />
        <View style={styles.orbitDot3} />
      </Animated.View>

      {/* Core badge */}
      <Animated.View style={{ transform: [{ scale: Animated.multiply(pulse, badgeScale) }] }}>
        <LinearGradient
          colors={[Colors.violet, Colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Label */}
      <Animated.View style={[styles.labelContainer, { opacity: fadeIn }]}>
        <Text style={styles.label}>Super-Pouvoir</Text>
        <Text style={styles.power}>{power}</Text>
        {description ? (
          <View style={styles.descriptionBadge}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  orbitRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(109,40,217,0.3)',
    borderStyle: 'dashed',
  },
  orbitDot1: {
    position: 'absolute',
    top: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.cyan,
  },
  orbitDot2: {
    position: 'absolute',
    bottom: 10,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.violet,
  },
  orbitDot3: {
    position: 'absolute',
    bottom: 10,
    left: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.pink,
  },
  badge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  emoji: {
    fontSize: 42,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  power: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.cyan,
    marginTop: 2,
  },
  descriptionBadge: {
    marginTop: 8,
    backgroundColor: Colors.blueNightCard,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    maxWidth: 280,
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 17,
  },
});
