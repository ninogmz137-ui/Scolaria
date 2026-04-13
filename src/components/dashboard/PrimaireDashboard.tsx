/**
 * PrimaireDashboard — Mode Primaire (6-11 ans)
 *
 * Inspire de Duolingo : gamification totale, couleurs saturees,
 * XP/coeurs/streaks, personnage avec personnalite,
 * progress rings, celebrations, animations bounce.
 */

import { useRef, useEffect } from 'react';
import { ScrollView, Animated, Easing } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TAB_BAR_SCROLL_PADDING } from '../FloatingTabBar';
import { SCREEN_BACKGROUND } from '../../constants/colors';

interface Props {
  childName: string;
  childAvatar: string;
}

// ─── Streak & hearts header bar (Duolingo top bar) ───────

function TopBar() {
  const heartPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, { toValue: 1.2, duration: 300, useNativeDriver: true }),
        Animated.timing(heartPulse, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
      ]),
    ).start();
  }, []);

  return (
    <HStack
      className="justify-center py-3.5 mx-5 mb-2 rounded-2xl"
      style={{ backgroundColor: '#F1F5F9', gap: 24 }}
    >
      {/* Streak */}
      <HStack className="items-center" style={{ gap: 6 }}>
        <Text style={{ fontSize: 18 }}>🔥</Text>
        <Text className="text-[17px] font-black" style={{ color: '#FFD66B' }}>12</Text>
      </HStack>
      {/* Gems */}
      <HStack className="items-center" style={{ gap: 6 }}>
        <Text style={{ fontSize: 18 }}>💎</Text>
        <Text className="text-[17px] font-black" style={{ color: '#38BDF8' }}>340</Text>
      </HStack>
      {/* Hearts */}
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ scale: heartPulse }] }}>
        <Text style={{ fontSize: 18 }}>❤️</Text>
        <Text className="text-[17px] font-black" style={{ color: '#F87171' }}>5</Text>
      </Animated.View>
    </HStack>
  );
}

// ─── XP Progress ring (Duolingo daily goal) ──────────────

function XPRing({ xp, goal, level }: { xp: number; goal: number; level: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const levelPop = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.8)).current;
  const pct = Math.min(xp / goal, 1);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(progress, {
        toValue: pct, duration: 1500,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.spring(levelPop, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1.0, duration: 800,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.8, duration: 800,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 1600);
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  return (
    <Box className="mb-6 px-5">
      <Box className="rounded-[20px] overflow-hidden">
        <LinearGradient
          colors={['#EEF2FF', '#E0E7FF']}
          style={{ padding: 22 }}
        >
          <HStack className="justify-between items-center mb-4">
            <Animated.View style={{ borderRadius: 14, overflow: 'hidden', transform: [{ scale: levelPop }] }}>
              <LinearGradient
                colors={['#F59E0B', '#F97316']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingHorizontal: 16, paddingVertical: 7 }}
              >
                <Text className="text-sm font-black" style={{ color: '#FFFFFF' }}>Niv. {level}</Text>
              </LinearGradient>
            </Animated.View>
            <HStack className="items-center" style={{ gap: 4 }}>
              <Ionicons name="flash" size={14} color="#FFD66B" />
              <Text className="text-sm font-bold" style={{ color: '#64748B' }}>{xp} / {goal} XP</Text>
            </HStack>
          </HStack>

          {/* Progress bar */}
          <Box className="h-4 rounded-lg overflow-hidden" style={{ backgroundColor: '#E2E8F0' }}>
            <Animated.View style={{ height: '100%', borderRadius: 8, overflow: 'hidden', width: barWidth as any }}>
              <Animated.View style={{ flex: 1, opacity: glowOpacity }}>
                <LinearGradient
                  colors={['#22D3EE', '#818CF8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flex: 1, borderRadius: 8 }}
                />
              </Animated.View>
            </Animated.View>
          </Box>

          <Text className="text-[13px] font-semibold text-center mt-3" style={{ color: '#64748B' }}>
            {goal - xp > 0 ? `Encore ${goal - xp} XP pour le niveau ${level + 1} 🚀` : 'Niveau suivant debloque ! 🎉'}
          </Text>
        </LinearGradient>
      </Box>
    </Box>
  );
}

// ─── Quests (Duolingo daily quests) ──────────────────────

const QUESTS = [
  { title: 'Termine 3 exercices', xp: 30, emoji: '📐', done: true, color: '#22D3EE' },
  { title: 'Lis pendant 15 min', xp: 20, emoji: '📖', done: true, color: '#A78BFA' },
  { title: 'Check-in du jour', xp: 15, emoji: '😊', done: false, color: '#34D399' },
  { title: 'Revise le vocabulaire', xp: 25, emoji: '🇬🇧', done: false, color: '#FBBF24' },
];

function DailyQuests() {
  const anims = useRef(QUESTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(80,
      anims.map((a) => Animated.spring(a, {
        toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
      })),
    ).start();
  }, []);

  return (
    <Box className="mb-6">
      <HStack className="justify-between items-center px-6 mb-3.5">
        <Text
          className="text-[11px] font-extrabold tracking-[2px]"
          style={{ color: '#6B7280' }}
        >
          QUETES DU JOUR
        </Text>
        <Box className="px-2.5 py-1 rounded-xl" style={{ backgroundColor: '#34D39920' }}>
          <Text className="text-[13px] font-extrabold" style={{ color: '#34D399' }}>
            {QUESTS.filter((q) => q.done).length}/{QUESTS.length}
          </Text>
        </Box>
      </HStack>
      {QUESTS.map((q, i) => (
        <Animated.View
          key={q.title}
          style={{
            opacity: anims[i],
            transform: [{
              translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          }}
        >
          <Pressable
            className="flex-row items-center mx-5 mb-2.5 rounded-[18px] p-4"
            style={{
              backgroundColor: SCREEN_BACKGROUND,
              gap: 14,
            }}
          >
            <Box
              className="w-12 h-12 rounded-2xl justify-center items-center"
              style={{ backgroundColor: q.color + '18' }}
            >
              <Text style={{ fontSize: 24 }}>{q.emoji}</Text>
            </Box>
            <Box className="flex-1">
              <Text
                className="text-[15px] font-bold mb-1"
                style={{
                  color: q.done ? '#94A3B8' : '#0F172A',
                  textDecorationLine: q.done ? 'line-through' : 'none',
                }}
              >
                {q.title}
              </Text>
              <HStack className="items-center" style={{ gap: 4 }}>
                <Ionicons name="flash" size={12} color="#FFD66B" />
                <Text className="text-[13px] font-extrabold" style={{ color: '#FFD66B' }}>+{q.xp} XP</Text>
              </HStack>
            </Box>
            {q.done ? (
              <Box className="w-[30px] h-[30px] rounded-[15px] justify-center items-center" style={{ backgroundColor: '#34D399' }}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </Box>
            ) : (
              <Box className="w-[30px] h-[30px] rounded-[15px]" style={{ borderWidth: 2.5, borderColor: '#CBD5E1' }} />
            )}
          </Pressable>
        </Animated.View>
      ))}
    </Box>
  );
}

// ─── Badge collection (Duolingo achievements) ────────────

const BADGES = [
  { emoji: '🏆', name: 'Champion', earned: true, color: '#F59E0B' },
  { emoji: '📚', name: 'Lecteur', earned: true, color: '#8B5CF6' },
  { emoji: '🧮', name: 'Matheux', earned: true, color: '#7C3AED' },
  { emoji: '🎨', name: 'Artiste', earned: false, color: '#EC4899' },
  { emoji: '🌍', name: 'Explorateur', earned: false, color: '#10B981' },
  { emoji: '⚡', name: 'Rapide', earned: false, color: '#F97316' },
];

function BadgesGrid() {
  const anims = useRef(BADGES.map(() => new Animated.Value(0))).current;
  const bounceAnims = useRef(BADGES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.stagger(60,
      anims.map((a) => Animated.spring(a, {
        toValue: 1, tension: 80, friction: 6, useNativeDriver: true,
      })),
    ).start();
  }, []);

  const handleBadgeTap = (index: number, earned: boolean) => {
    if (!earned) return;
    bounceAnims[index].setValue(1);
    Animated.sequence([
      Animated.spring(bounceAnims[index], {
        toValue: 1.15, speed: 50, bounciness: 12, useNativeDriver: true,
      }),
      Animated.spring(bounceAnims[index], {
        toValue: 1, speed: 50, bounciness: 12, useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Box className="mb-6">
      <Text
        className="text-[11px] font-extrabold tracking-[2px] px-6 mb-1"
        style={{ color: '#6B7280' }}
      >
        COLLECTION
      </Text>
      <HStack className="justify-between items-center pr-6">
        <Text className="text-[22px] font-black px-6 mb-3.5" style={{ color: '#0F172A' }}>
          Badges 🏅
        </Text>
        <Text className="text-sm font-extrabold" style={{ color: '#22D3EE' }}>
          {BADGES.filter((b) => b.earned).length}/{BADGES.length}
        </Text>
      </HStack>
      <Box className="flex-row flex-wrap px-5 justify-center" style={{ gap: 10 }}>
        {BADGES.map((b, i) => (
          <Animated.View
            key={b.name}
            style={{ transform: [{ scale: Animated.multiply(anims[i], bounceAnims[i]) }] }}
          >
            <Pressable
              className="w-[100px] items-center py-[18px] rounded-[20px]"
              style={{
                backgroundColor: b.earned ? b.color + '08' : SCREEN_BACKGROUND,
              }}
              onPress={() => handleBadgeTap(i, b.earned)}
            >
              <Box
                className="w-12 h-12 rounded-3xl justify-center items-center mb-2"
                style={{ backgroundColor: b.earned ? b.color + '15' : '#E2E8F0' }}
              >
                <Text style={{ fontSize: 26, opacity: b.earned ? 1 : 0.3 }}>
                  {b.earned ? b.emoji : '🔒'}
                </Text>
              </Box>
              <Text
                className="text-xs font-bold"
                style={{ color: b.earned ? '#0F172A' : '#94A3B8' }}
              >
                {b.name}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </Box>
    </Box>
  );
}

// ─── Grades with fun streak display ──────────────────────

function GradeCards() {
  const GRADES = [
    { subject: 'Maths', grade: 16, emoji: '📐', color: '#22D3EE', streak: 3 },
    { subject: 'Francais', grade: 14, emoji: '📖', color: '#A78BFA', streak: 2 },
    { subject: 'Sciences', grade: 18, emoji: '🔬', color: '#34D399', streak: 5 },
    { subject: 'Histoire', grade: 15, emoji: '🏛️', color: '#FBBF24', streak: 1 },
  ];

  const anims = useRef(GRADES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(100,
      anims.map((a) => Animated.spring(a, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
      })),
    ).start();
  }, []);

  return (
    <Box className="mb-6">
      <Text
        className="text-[11px] font-extrabold tracking-[2px] px-6 mb-1"
        style={{ color: '#6B7280' }}
      >
        DERNIERES NOTES
      </Text>
      <Text className="text-[22px] font-black px-6 mb-3.5" style={{ color: '#0F172A' }}>
        Resultats 📊
      </Text>
      <Box className="flex-row flex-wrap px-5 justify-between" style={{ gap: 12 }}>
        {GRADES.map((g, i) => (
          <Animated.View
            key={g.subject}
            style={{
              transform: [{ scale: anims[i] }],
              width: '47%',
            }}
          >
            <Box
              className="items-center rounded-[20px] p-[18px]"
              style={{ backgroundColor: SCREEN_BACKGROUND }}
            >
              <Box
                className="w-11 h-11 rounded-[22px] justify-center items-center mb-2.5"
                style={{ backgroundColor: g.color + '15' }}
              >
                <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
              </Box>
              <Text className="text-[32px] font-black" style={{ color: g.color }}>{g.grade}</Text>
              <Text className="text-sm font-semibold -mt-1" style={{ color: '#94A3B8' }}>/20</Text>
              <Text className="text-[13px] font-bold mt-1.5" style={{ color: '#64748B' }}>{g.subject}</Text>
              {g.streak > 1 && (
                <Box className="mt-2 px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: 'rgba(255,214,107,0.08)' }}>
                  <Text className="text-xs font-bold" style={{ color: '#FFD66B' }}>🔥 {g.streak} serie</Text>
                </Box>
              )}
            </Box>
          </Animated.View>
        ))}
      </Box>
    </Box>
  );
}

// ─── Main ────────────────────────────────────────────────

export default function PrimaireDashboard({ childName, childAvatar }: Props) {
  const planetFloat = useRef(new Animated.Value(0)).current;
  const planetRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(planetFloat, {
          toValue: -12, duration: 1500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(planetFloat, {
          toValue: 0, duration: 1500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(planetRotate, {
        toValue: 1, duration: 6000,
        easing: Easing.linear, useNativeDriver: true,
      }),
    ).start();
  }, []);

  const planetSpin = planetRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
    >
      <LinearGradient
        colors={['#EEF2FF', '#F5F3FF', SCREEN_BACKGROUND]}
        style={{ minHeight: '100%', paddingBottom: 20 }}
      >
        {/* Header */}
        <HStack className="justify-between items-center px-6 pt-4 pb-2">
          <Box>
            <Text className="text-[28px] font-black" style={{ color: '#0F172A' }}>
              Hey {childName} ! 🚀
            </Text>
            <Text className="text-sm mt-0.5" style={{ color: '#64748B' }}>Pret pour l'aventure ?</Text>
          </Box>
          <Box
            className="w-[52px] h-[52px] rounded-[26px] justify-center items-center"
            style={{ backgroundColor: 'rgba(109,40,217,0.1)', borderWidth: 2.5, borderColor: '#22D3EE' }}
          >
            <Text style={{ fontSize: 26 }}>{childAvatar}</Text>
          </Box>
        </HStack>

        {/* Floating planet */}
        <Animated.View style={{
          position: 'absolute', top: 50, right: 80,
          transform: [{ translateY: planetFloat }, { rotate: planetSpin }],
        }}>
          <Text style={{ fontSize: 42 }}>🪐</Text>
        </Animated.View>

        <TopBar />
        <XPRing xp={720} goal={1000} level={7} />
        <DailyQuests />
        <BadgesGrid />
        <GradeCards />

        <Box style={{ height: 40 }} />
      </LinearGradient>
    </ScrollView>
  );
}
