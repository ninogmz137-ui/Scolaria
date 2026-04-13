/**
 * MaternelleDashboard — Mode Maternelle (3-6 ans)
 *
 * Inspire de Calm : fond doux degrade, animations fluides,
 * bulles flottantes, pas de notes chiffrees, tout en rondeur.
 * Personnage Aria doux qui respire, ambiance rassurante.
 */

import { useRef, useEffect, useState } from 'react';
import { ScrollView, Animated, Easing, Dimensions } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import { TAB_BAR_SCROLL_PADDING } from '../FloatingTabBar';
import { SCREEN_BACKGROUND } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface Props {
  childName: string;
  childAvatar: string;
}

// ─── Floating bubbles background ─────────────────────────

function FloatingBubbles() {
  const bubbles = [
    { size: 80, x: -20, delay: 0, color: 'rgba(255,176,122,0.12)' },
    { size: 120, x: width - 80, delay: 400, color: 'rgba(255,214,107,0.10)' },
    { size: 60, x: 50, delay: 800, color: 'rgba(255,140,66,0.08)' },
    { size: 90, x: width - 130, delay: 200, color: 'rgba(255,224,192,0.12)' },
  ];

  const anims = useRef(bubbles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    bubbles.forEach((_, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anims[i], {
            toValue: 1,
            duration: 3000 + i * 500,
            delay: bubbles[i].delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anims[i], {
            toValue: 0,
            duration: 3000 + i * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  return (
    <>
      {bubbles.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: b.color,
            left: b.x,
            top: 40 + i * 60,
            transform: [{
              translateY: anims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, -20],
              }),
            }],
            opacity: anims[i].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.6, 1, 0.6],
            }),
          }}
        />
      ))}
    </>
  );
}

// ─── Breathing Aria mascot (Calm-style) ──────────────────

function AriaMascot({ childName }: { childName: string }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] });

  return (
    <Box className="items-center z-[1]" style={{ marginVertical: 20, height: 150 }}>
      {/* Glow ring */}
      <Animated.View style={{
        position: 'absolute', width: 130, height: 130, borderRadius: 65,
        backgroundColor: '#FFD66B',
        transform: [{ scale: glowScale }],
        opacity: glowOpacity,
      }} />
      <Animated.View style={{
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#FFB07A',
        transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
        opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] }),
      }} />

      {/* Mascot */}
      <Animated.View style={{
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: SCREEN_BACKGROUND,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0, shadowRadius: 0, elevation: 0,
        borderWidth: 3, borderColor: '#FFE0C0',
        transform: [{ scale }],
      }}>
        <Text style={{ fontSize: 56 }}>🧸</Text>
      </Animated.View>

      {/* Speech bubble */}
      <Box
        className="absolute bottom-0 rounded-[20px] px-5 py-3"
        style={{
          backgroundColor: SCREEN_BACKGROUND,
          shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0, shadowRadius: 0, elevation: 0,
          maxWidth: 220,
        }}
      >
        <Box
          className="absolute"
          style={{
            top: -8, left: '45%',
            width: 0, height: 0,
            borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: '#FFFFFF',
          }}
        />
        <Text className="text-[15px] text-center leading-[22px]" style={{ color: '#6B4C35' }}>
          Coucou {childName} ! {'\n'}
          <Text className="font-extrabold" style={{ color: '#FF8C42' }}>Comment tu vas ?</Text>
        </Text>
      </Box>
    </Box>
  );
}

// ─── Giant emotion picker (Calm-inspired) ────────────────

const EMOTIONS = [
  { emoji: '😄', label: 'Super', bg: '#E8F5E9', border: '#66BB6A' },
  { emoji: '😊', label: 'Bien', bg: '#F1F8E9', border: '#9CCC65' },
  { emoji: '😐', label: 'Bof', bg: '#FFF8E1', border: '#FFD54F' },
  { emoji: '😢', label: 'Triste', bg: '#FFF3E0', border: '#FFB74D' },
  { emoji: '😡', label: 'Fache', bg: '#FFEBEE', border: '#EF5350' },
];

function EmotionPicker() {
  const scales = useRef(EMOTIONS.map(() => new Animated.Value(0))).current;
  const bounceAnims = useRef(EMOTIONS.map(() => new Animated.Value(1))).current;
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);

  useEffect(() => {
    Animated.stagger(100,
      scales.map((s) => Animated.spring(s, {
        toValue: 1, tension: 40, friction: 5, useNativeDriver: true,
      })),
    ).start();
  }, []);

  const handleEmotionPress = (index: number) => {
    setSelectedEmotion(index);
    bounceAnims[index].setValue(1.3);
    Animated.spring(bounceAnims[index], {
      toValue: 1,
      tension: 300,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Box className="mb-9 z-[1]">
      <Text
        className="text-[11px] font-extrabold uppercase tracking-[2px] px-6 mb-1"
        style={{ color: '#8B7355' }}
      >
        COMMENT TU TE SENS ?
      </Text>
      <Text className="text-2xl font-black px-6 mb-4" style={{ color: '#2D1B0E' }}>
        Choisis ton humeur 💭
      </Text>
      <HStack className="justify-around px-2">
        {EMOTIONS.map((e, i) => (
          <Animated.View key={e.emoji} style={{ transform: [{ scale: Animated.multiply(scales[i], bounceAnims[i]) }] }}>
            <Pressable
              className="items-center py-3.5 px-2.5 rounded-[22px] min-w-[64px]"
              style={{
                backgroundColor: e.bg,
                borderColor: e.border,
                borderWidth: 2.5,
                ...(selectedEmotion === i ? {
                  shadowColor: 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0,
                  shadowRadius: 0,
                  elevation: 0,
                } : {}),
              }}
              onPress={() => handleEmotionPress(i)}
            >
              <Text style={{ fontSize: 44, marginBottom: 6 }}>{e.emoji}</Text>
              <Text className="text-xs font-extrabold" style={{ color: e.border }}>{e.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </HStack>
    </Box>
  );
}

// ─── Activity carousel (Calm category cards) ────────────

const ACTIVITIES = [
  { emoji: '🎨', title: 'Dessin', sub: 'Les couleurs', gradient: ['#FF9A76', '#FFCBA4'] as [string, string] },
  { emoji: '🎵', title: 'Musique', sub: 'Comptines', gradient: ['#A18CD1', '#FBC2EB'] as [string, string] },
  { emoji: '🌿', title: 'Nature', sub: 'Le jardin', gradient: ['#A8E6CF', '#DCEDC1'] as [string, string] },
  { emoji: '📖', title: 'Histoire', sub: 'Le petit ours', gradient: ['#89CFF0', '#B8E8FC'] as [string, string] },
];

function ActivityCarousel() {
  const slideAnims = useRef(ACTIVITIES.map(() => new Animated.Value(40))).current;
  const fadeAnims = useRef(ACTIVITIES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    ACTIVITIES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(slideAnims[i], {
          toValue: 0, duration: 600, delay: i * 120,
          easing: Easing.out(Easing.back(1.5)), useNativeDriver: true,
        }),
        Animated.timing(fadeAnims[i], {
          toValue: 1, duration: 500, delay: i * 120, useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <Box className="mb-9 z-[1]">
      <Text
        className="text-[11px] font-extrabold uppercase tracking-[2px] px-6 mb-1"
        style={{ color: '#8B7355' }}
      >
        ACTIVITES DU JOUR
      </Text>
      <Text className="text-2xl font-black px-6 mb-4" style={{ color: '#2D1B0E' }}>
        Ta journee 🌈
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      >
        {ACTIVITIES.map((a, i) => (
          <Animated.View
            key={a.title}
            style={{
              transform: [{ translateX: slideAnims[i] }],
              opacity: fadeAnims[i],
            }}
          >
            <Pressable>
              <LinearGradient
                colors={a.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 140, height: 170, borderRadius: 24,
                  padding: 18, justifyContent: 'flex-end',
                  shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0, shadowRadius: 0, elevation: 0,
                }}
              >
                <Box
                  className="w-[52px] h-[52px] rounded-[26px] justify-center items-center mb-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                >
                  <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                </Box>
                <Text className="text-[17px] font-extrabold mb-0.5" style={{ color: '#FFFFFF' }}>{a.title}</Text>
                <Text className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{a.sub}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
}

// ─── Star reward (visual, no numbers) ────────────────────

function StarReward() {
  const starsAnim = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(starsAnim, {
      toValue: 1, tension: 30, friction: 5, delay: 500, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const starScale = starsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const shineRotate = shine.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });

  return (
    <Box className="mb-9 z-[1]">
      <Text
        className="text-[11px] font-extrabold uppercase tracking-[2px] px-6 mb-1"
        style={{ color: '#8B7355' }}
      >
        TES RECOMPENSES
      </Text>
      <Text className="text-2xl font-black px-6 mb-4" style={{ color: '#2D1B0E' }}>
        Bravo ! ⭐
      </Text>
      <Box
        className="mx-5 rounded-3xl overflow-hidden"
        style={{
          shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0, shadowRadius: 0, elevation: 0,
        }}
      >
        <LinearGradient
          colors={['#FFF8E1', '#FFFFFF']}
          style={{ padding: 28, alignItems: 'center' }}
        >
          <Animated.View style={{ transform: [{ scale: starScale }, { rotate: shineRotate }] }}>
            <Text style={{ fontSize: 72, marginBottom: 10 }}>🌟</Text>
          </Animated.View>
          <Text className="text-[28px] font-black" style={{ color: '#E67A35' }}>12 etoiles</Text>
          <Text className="text-sm text-center mt-1" style={{ color: '#B8956A' }}>
            Tu as ete formidable cette semaine !
          </Text>
          <HStack className="mt-4" style={{ gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <Box
                key={i}
                className="w-10 h-10 rounded-[20px] justify-center items-center"
                style={{ backgroundColor: '#FFF8E1' }}
              >
                <Text style={{ fontSize: 18 }}>⭐</Text>
              </Box>
            ))}
          </HStack>
        </LinearGradient>
      </Box>
    </Box>
  );
}

// ─── Visual timeline (Calm sleep stories style) ──────────

function VisualTimeline() {
  const MOMENTS = [
    { emoji: '🌅', label: 'Matin', activity: 'Lecture & comptines', color: '#FFD54F', bg: '#FFFDE7' },
    { emoji: '🎨', label: 'Activite', activity: 'Dessin libre', color: '#FF8C42', bg: '#FFF3E0' },
    { emoji: '🍽️', label: 'Midi', activity: 'Dejeuner', color: '#66BB6A', bg: '#E8F5E9' },
    { emoji: '😴', label: 'Sieste', activity: 'Repos', color: '#AB47BC', bg: '#F3E5F5' },
    { emoji: '🌤️', label: 'Apres-midi', activity: 'Jeux dehors', color: '#42A5F5', bg: '#E3F2FD' },
  ];

  const lineAnims = useRef(MOMENTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(150,
      lineAnims.map((a) => Animated.spring(a, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
      })),
    ).start();
  }, []);

  return (
    <Box className="mb-9 z-[1]">
      <Text
        className="text-[11px] font-extrabold uppercase tracking-[2px] px-6 mb-1"
        style={{ color: '#8B7355' }}
      >
        EMPLOI DU TEMPS
      </Text>
      <Text className="text-2xl font-black px-6 mb-4" style={{ color: '#2D1B0E' }}>
        Ma journee 🕐
      </Text>
      {MOMENTS.map((m, i) => (
        <Animated.View
          key={m.label}
          style={{
            opacity: lineAnims[i],
            transform: [{
              translateX: lineAnims[i].interpolate({
                inputRange: [0, 1], outputRange: [-30, 0],
              }),
            }],
          }}
        >
          <HStack className="px-6 mb-1">
            {/* Connector line */}
            <Box className="w-6 items-center pt-4">
              <Box className="w-3 h-3 rounded-[6px] z-[1]" style={{ backgroundColor: m.color }} />
              {i < MOMENTS.length - 1 && (
                <Box className="w-[3px] flex-1 -mt-px rounded-sm" style={{ backgroundColor: m.color + '30' }} />
              )}
            </Box>

            {/* Card */}
            <HStack
              className="flex-1 items-center ml-3 p-4 rounded-[20px] mb-1.5"
              style={{ backgroundColor: m.bg, gap: 14 }}
            >
              <Text style={{ fontSize: 36 }}>{m.emoji}</Text>
              <Box>
                <Text className="text-sm font-extrabold" style={{ color: m.color }}>{m.label}</Text>
                <Text className="text-[13px] mt-0.5" style={{ color: '#6B4C35' }}>{m.activity}</Text>
              </Box>
            </HStack>
          </HStack>
        </Animated.View>
      ))}
    </Box>
  );
}

// ─── Main ────────────────────────────────────────────────

export default function MaternelleDashboard({ childName, childAvatar }: Props) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF8F0' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
    >
      <LinearGradient
        colors={['#FFF2E5', '#FFF8F0', '#FFFFFF']}
        style={{ minHeight: '100%', paddingBottom: 20 }}
      >
        <FloatingBubbles />

        {/* Header */}
        <HStack className="justify-between items-center px-6 pt-4 pb-1 z-[1]">
          <Box>
            <Text className="text-base font-medium tracking-wide" style={{ color: '#B8956A' }}>Coucou</Text>
            <Text className="text-[34px] font-black mt-0.5" style={{ color: '#2D1B0E' }}>{childName} ! 🌞</Text>
          </Box>
          <Box
            className="w-[60px] h-[60px] rounded-[30px] justify-center items-center"
            style={{ borderWidth: 3, borderColor: '#FF8C42', backgroundColor: '#FFE0C0' }}
          >
            <Box
              className="w-[50px] h-[50px] rounded-[25px] justify-center items-center"
              style={{ backgroundColor: '#FFF2E5' }}
            >
              <Text style={{ fontSize: 28 }}>{childAvatar}</Text>
            </Box>
          </Box>
        </HStack>

        <AriaMascot childName={childName} />
        <EmotionPicker />
        <ActivityCarousel />
        <StarReward />
        <VisualTimeline />

        <Box style={{ height: 40 }} />
      </LinearGradient>
    </ScrollView>
  );
}
