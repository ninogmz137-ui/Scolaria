import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Share,
} from 'react-native';
import { Box, Text, Pressable, HStack } from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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

// ─── Component ────────────────────────────────────────────

export default function SuperPowerBadge({
  power,
  emoji,
  description,
  childName,
  tags = [],
  trimesterWeeksLeft = 6,
  accentColor = '#22D3EE',
  accentLight = '#6D28D9',
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const tagsFade = useRef(new Animated.Value(0)).current;
  const tagsSlide = useRef(new Animated.Value(15)).current;
  const shareFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
        <Text className="text-lg font-bold" style={{ color: '#0F172A' }}>
          Super-Pouvoir
        </Text>
        <HStack
          className="items-center gap-1 px-2 py-1 rounded-lg"
          style={{ backgroundColor: accentLight + '12', borderWidth: 1, borderColor: accentLight + '20' }}
        >
          <Ionicons name="sparkles" size={10} color={accentColor} />
          <Text className="text-[10px] font-bold" style={{ color: accentColor }}>
            Observé par Aria
          </Text>
        </HStack>
      </HStack>

      {/* Badge area — clean, no orbit rings */}
      <Box className="justify-center items-center mt-2 mb-1" style={{ width: 140, height: 140 }}>
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
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 6,
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
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#EEF0F5',
            gap: 10,
            marginBottom: 14,
            width: '100%',
          }}
        >
          <Box
            className="justify-center items-center mt-0.5"
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: accentColor + '12' }}
          >
            <Ionicons name="chatbubble-ellipses" size={14} color={accentColor} />
          </Box>
          <Text className="flex-1 text-[13px] italic" style={{ color: '#64748B', lineHeight: 19 }}>
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
              style={{ borderWidth: 1, borderColor: tag.color + '25', backgroundColor: tag.color + '08' }}
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
        <Ionicons name="eye-outline" size={14} color="#94A3B8" />
        <Text className="text-xs font-medium" style={{ color: '#94A3B8' }}>
          Profil observé ce trimestre · Révisé dans {trimesterWeeksLeft} semaines
        </Text>
      </Animated.View>

      {/* Share button */}
      <Animated.View style={{ opacity: shareFade, width: '100%' }}>
        <Pressable
          className="rounded-2xl overflow-hidden"
          style={{ borderWidth: 1, borderColor: accentColor + '20' }}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[accentColor + '08', accentLight + '08']}
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
              <Ionicons name="logo-whatsapp" size={14} color="#34D399" />
              <Ionicons name="mail-outline" size={14} color="#94A3B8" />
            </HStack>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Box>
  );
}
