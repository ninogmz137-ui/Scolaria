import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Share,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// ─── Types ────────────────────────────────────────────────

export interface ProfileTag {
  label: string;
  emoji: string;
  color: string;
}

interface Props {
  power: string;
  emoji: string;
  description?: string;
  childName: string;
  tags?: ProfileTag[];
  trimesterWeeksLeft?: number;
  accentColor?: string;
  accentLight?: string;
}

// ─── Orbit Particle ───────────────────────────────────────

function OrbitParticle({
  size,
  color,
  orbitRadius,
  startAngle,
  duration,
  delay,
  glowing,
}: {
  size: number;
  color: string;
  orbitRadius: number;
  startAngle: number;
  duration: number;
  delay: number;
  glowing?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
        delay,
      }),
    ).start();
  }, []);

  const spin = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${(startAngle * 180) / Math.PI}deg`, `${(startAngle * 180) / Math.PI + 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: orbitRadius * 2,
        height: orbitRadius * 2,
        transform: [{ rotate: spin }],
      }}
    >
      <Box
        style={{
          position: 'absolute',
          top: -size / 2,
          left: orbitRadius - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          ...(glowing
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
                elevation: 6,
              }
            : {}),
        }}
      />
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────

export default function SuperPowerBadge({
  power,
  emoji,
  description,
  childName,
  tags = [],
  trimesterWeeksLeft = 6,
  accentColor = Colors.cyan,
  accentLight = Colors.violet,
}: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const tagsFade = useRef(new Animated.Value(0)).current;
  const tagsSlide = useRef(new Animated.Value(15)).current;
  const shareFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
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
      Animated.parallel([
        Animated.timing(tagsFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(tagsSlide, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(shareFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Slow orbit ring rotation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Core pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const orbitSpin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleShare = async () => {
    const shareText = `${emoji} ${childName} — ${power}\n\n${description ?? ''}\n\n${tags.map((t) => `${t.emoji} ${t.label}`).join(' · ')}\n\n— Profil Scolaria`;
    try {
      await Share.share({
        message: shareText,
        title: `Super-Pouvoir de ${childName}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <Box className="items-center">
      {/* Section label */}
      <HStack className="items-center justify-between w-full mb-2">
        <Text className="text-lg font-bold" style={{ color: Colors.white }}>
          Super-Pouvoir
        </Text>
        <HStack
          className="items-center gap-1 px-2 py-1 rounded-lg"
          style={{ backgroundColor: accentLight + '20', borderWidth: 1, borderColor: accentLight + '30' }}
        >
          <Ionicons name="sparkles" size={10} color={accentLight} />
          <Text className="text-[10px] font-bold" style={{ color: accentLight }}>
            Observé par Aria
          </Text>
        </HStack>
      </HStack>

      {/* Badge area with orbiting particles */}
      <Box className="justify-center items-center mt-2 mb-1" style={{ width: 180, height: 180 }}>
        {/* Outer orbit ring (dashed) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            transform: [{ rotate: orbitSpin }],
            borderColor: accentLight + '25',
          }}
        />

        {/* Inner orbit ring */}
        <Box
          className="absolute rounded-full"
          style={{ width: 120, height: 120, borderWidth: 1, borderColor: accentColor + '15' }}
        />

        {/* Orbiting particles */}
        <Box className="absolute justify-center items-center" style={{ width: 0, height: 0 }}>
          <OrbitParticle size={12} color={accentColor} orbitRadius={80} startAngle={0} duration={8000} delay={0} glowing />
          <OrbitParticle size={8} color={accentLight} orbitRadius={80} startAngle={2.1} duration={8000} delay={0} />
          <OrbitParticle size={6} color={Colors.pink} orbitRadius={80} startAngle={4.2} duration={8000} delay={0} />
          <OrbitParticle size={10} color={Colors.green} orbitRadius={60} startAngle={1} duration={6000} delay={200} glowing />
          <OrbitParticle size={5} color={Colors.orange} orbitRadius={60} startAngle={3.5} duration={6000} delay={200} />
          <OrbitParticle size={7} color={accentColor} orbitRadius={60} startAngle={5.5} duration={6000} delay={200} />
        </Box>

        {/* Core badge */}
        <Animated.View style={{ transform: [{ scale: Animated.multiply(pulse, badgeScale) }] }}>
          <LinearGradient
            colors={[accentLight, accentColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
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
            }}
          >
            <Text className="text-[42px]">{emoji}</Text>
          </LinearGradient>
        </Animated.View>
      </Box>

      {/* Power title */}
      <Animated.View style={{ alignItems: 'center', marginTop: 6, marginBottom: 10, opacity: fadeIn }}>
        <Text className="text-[22px] font-black tracking-wide" style={{ color: accentColor }}>
          {power}
        </Text>
      </Animated.View>

      {/* Aria-generated description */}
      {description ? (
        <Animated.View
          style={{
            opacity: fadeIn,
            flexDirection: 'row',
            backgroundColor: Colors.blueNightCard,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            gap: 10,
            marginBottom: 14,
            width: '100%',
          }}
        >
          <Box
            className="justify-center items-center mt-0.5"
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: accentLight + '15' }}
          >
            <Ionicons name="chatbubble-ellipses" size={14} color={accentLight} />
          </Box>
          <Text className="flex-1 text-[13px] italic" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 19 }}>
            {description}
          </Text>
        </Animated.View>
      ) : null}

      {/* Profile tags */}
      {tags.length > 0 && (
        <Animated.View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 14,
            width: '100%',
            opacity: tagsFade,
            transform: [{ translateY: tagsSlide }],
          }}
        >
          {tags.map((tag) => (
            <HStack
              key={tag.label}
              className="items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ borderWidth: 1, borderColor: tag.color + '35', backgroundColor: tag.color + '10' }}
            >
              <Text className="text-[13px]">{tag.emoji}</Text>
              <Text className="text-xs font-bold" style={{ color: tag.color }}>
                {tag.label}
              </Text>
            </HStack>
          ))}
        </Animated.View>
      )}

      {/* Trimester observation */}
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, opacity: tagsFade }}>
        <Ionicons name="eye-outline" size={14} color={Colors.gray} />
        <Text className="text-xs font-medium" style={{ color: Colors.gray }}>
          Profil observé ce trimestre · Révisé dans {trimesterWeeksLeft} semaines
        </Text>
      </Animated.View>

      {/* Share button */}
      <Animated.View style={{ opacity: shareFade, width: '100%' }}>
        <Pressable
          className="rounded-2xl overflow-hidden"
          style={{ borderWidth: 1, borderColor: accentColor + '30' }}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[accentLight + '15', accentColor + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              paddingHorizontal: 20,
            }}
          >
            <Ionicons name="share-outline" size={18} color={accentColor} />
            <Text className="text-sm font-bold flex-1" style={{ color: accentColor }}>
              Partager la carte Super-Pouvoir
            </Text>
            <HStack className="gap-2">
              <Ionicons name="logo-whatsapp" size={14} color={Colors.green} />
              <Ionicons name="mail-outline" size={14} color={Colors.gray} />
            </HStack>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Box>
  );
}
