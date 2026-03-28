/**
 * LyceeDashboard — Mode College-Lycee (11-18 ans)
 *
 * Inspire de Notion : fond blanc epure, typographie systeme forte,
 * donnees analytiques propres, espaces genereux,
 * dark mode optionnel, Aria = coach sobre.
 */

import { useRef, useEffect, useState } from 'react';
import { ScrollView, Animated, Easing } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  childName: string;
  childAvatar: string;
}

// ─── Color system ────────────────────────────────────────

const light = {
  bg: '#FFFFFF', surface: '#F7F7F5', card: '#FFFFFF',
  border: '#E8E5E0', borderLight: '#F0EEED',
  text: '#37352F', textSub: '#787774', textMuted: '#B4B0AC',
  accent: '#2383E2', accentSoft: '#E8F0FE',
  green: '#0F7B6C', greenSoft: '#E6F4F1',
  red: '#EB5757', redSoft: '#FDECEC',
  orange: '#D9730D', orangeSoft: '#FDEBD0',
  purple: '#6940A5', purpleSoft: '#F0E9F7',
};

const dark = {
  bg: '#191919', surface: '#202020', card: '#252525',
  border: '#2F2F2F', borderLight: '#333333',
  text: '#E8E5E0', textSub: '#9B9A97', textMuted: '#5A5A5A',
  accent: '#529CCA', accentSoft: '#1B3A4B',
  green: '#4DAB9A', greenSoft: '#1A2F2B',
  red: '#EB5757', redSoft: '#3D2020',
  orange: '#D9730D', orangeSoft: '#3D2A0F',
  purple: '#9A6DD7', purpleSoft: '#2D1F3D',
};

// ─── Aria Coach (Notion-style callout) ───────────────────

function AriaCoach({ c }: { c: typeof light }) {
  return (
    <Box
      className="mx-5 my-3 rounded-xl p-[18px]"
      style={{ backgroundColor: c.purpleSoft, borderWidth: 1, borderColor: c.border }}
    >
      <HStack style={{ gap: 14 }} className="mb-4">
        <Box className="w-10 h-10 rounded-lg justify-center items-center" style={{ backgroundColor: c.card }}>
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </Box>
        <Box className="flex-1">
          <HStack className="items-center mb-1.5" style={{ gap: 8 }}>
            <Text className="text-[15px] font-bold" style={{ color: c.text }}>Aria Coach</Text>
            <Box className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: c.green }} />
          </HStack>
          <Text className="text-sm leading-[21px]" style={{ color: c.textSub }}>
            Tes resultats en maths progressent de{' '}
            <Text className="font-bold" style={{ color: c.green }}>+2.3 pts</Text> ce trimestre.
            Revise les probabilites avant vendredi.
          </Text>
        </Box>
      </HStack>
      <HStack style={{ gap: 10 }}>
        <Pressable className="flex-1 py-2.5 rounded-lg items-center" style={{ backgroundColor: c.accent }}>
          <Text className="text-[13px] font-bold" style={{ color: '#FFFFFF' }}>Plan de revision</Text>
        </Pressable>
        <Pressable className="flex-1 py-2.5 rounded-lg items-center" style={{ borderWidth: 1, borderColor: c.border }}>
          <Text className="text-[13px] font-semibold" style={{ color: c.textSub }}>Parler a Aria</Text>
        </Pressable>
      </HStack>
    </Box>
  );
}

// ─── Stats overview (Notion database header) ─────────────

function StatsOverview({ c }: { c: typeof light }) {
  const STATS = [
    { label: 'Moyenne', value: '14.8', unit: '/20', trend: '+0.5', up: true },
    { label: 'Classement', value: '5', unit: 'eme', trend: '+2', up: true },
    { label: 'Assiduite', value: '96', unit: '%', trend: '', up: true },
    { label: 'Objectifs', value: '8', unit: '/10', trend: '+3', up: true },
    { label: 'Devoirs', value: '12', unit: '/15', trend: '', up: true },
    { label: 'Progression', value: '+4', unit: 'pts', trend: '+4', up: true },
  ];

  const anims = useRef(STATS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(80,
      anims.map((a) => Animated.timing(a, {
        toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      })),
    ).start();
  }, []);

  return (
    <Box className="mb-4">
      <Text className="text-[15px] font-semibold px-6 mb-3" style={{ color: c.text }}>
        Vue d'ensemble
      </Text>
      <Box className="flex-row flex-wrap px-5" style={{ gap: 10 }}>
        {STATS.map((s, i) => (
          <Animated.View
            key={s.label}
            style={{
              width: '31%',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              backgroundColor: c.card,
              borderColor: c.borderLight,
              opacity: anims[i],
              transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
            <HStack className="justify-between items-center mb-2.5">
              <Text className="text-xs font-semibold" style={{ color: c.textMuted }}>{s.label}</Text>
              {s.trend ? (
                <HStack
                  className="items-center px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: s.up ? c.greenSoft : c.redSoft, gap: 2 }}
                >
                  <Ionicons name={s.up ? 'arrow-up' : 'arrow-down'} size={10} color={s.up ? c.green : c.red} />
                  <Text className="text-[11px] font-bold" style={{ color: s.up ? c.green : c.red }}>{s.trend}</Text>
                </HStack>
              ) : null}
            </HStack>
            <HStack className="items-baseline">
              <Text className="text-[28px] font-extrabold" style={{ color: c.text }}>{s.value}</Text>
              <Text className="text-sm font-medium ml-0.5" style={{ color: c.textMuted }}>{s.unit}</Text>
            </HStack>
          </Animated.View>
        ))}
      </Box>
    </Box>
  );
}

// ─── Subject performance (Notion-style table rows) ───────

function SubjectPerformance({ c }: { c: typeof light }) {
  const SUBJECTS = [
    { name: 'Mathematiques', avg: 15.5, classAvg: 12.3, trend: 'up' as const, color: c.accent },
    { name: 'Francais', avg: 14.2, classAvg: 13.1, trend: 'up' as const, color: c.purple },
    { name: 'Histoire-Geo', avg: 16.8, classAvg: 11.9, trend: 'up' as const, color: c.green },
    { name: 'Anglais', avg: 17.0, classAvg: 14.2, trend: 'stable' as const, color: c.orange },
    { name: 'Physique-Chimie', avg: 13.5, classAvg: 12.8, trend: 'down' as const, color: c.red },
  ];

  const barAnims = useRef(SUBJECTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(100,
      barAnims.map((a) => Animated.timing(a, {
        toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      })),
    ).start();
  }, []);

  return (
    <Box className="mb-4">
      <Text className="text-[15px] font-semibold px-6 mb-3" style={{ color: c.text }}>Performance</Text>
      <Box className="mx-5 rounded-xl overflow-hidden" style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.borderLight }}>
        {/* Table header */}
        <HStack
          className="items-center py-2.5 px-4"
          style={{ borderBottomWidth: 1, borderBottomColor: c.border }}
        >
          <Text className="flex-[3] text-[11px] font-semibold" style={{ color: c.textMuted }}>Matiere</Text>
          <Text className="w-[42px] text-[11px] font-semibold text-center" style={{ color: c.textMuted }}>Moy.</Text>
          <Text className="w-[42px] text-[11px] font-semibold text-center" style={{ color: c.textMuted }}>Classe</Text>
          <Text className="flex-[2] text-[11px] font-semibold text-right" style={{ color: c.textMuted }}>Progression</Text>
        </HStack>

        {SUBJECTS.map((s, i) => (
          <Animated.View
            key={s.name}
            style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
              opacity: barAnims[i],
              ...(i < SUBJECTS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: c.borderLight } : {}),
            }}
          >
            <HStack className="flex-[3] items-center" style={{ gap: 8 }}>
              <Box className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <Text className="text-[13px] font-semibold flex-1" style={{ color: c.text }} numberOfLines={1}>{s.name}</Text>
            </HStack>
            <Text className="w-[42px] text-sm font-bold text-center" style={{ color: c.text }}>{s.avg.toFixed(1)}</Text>
            <Text className="w-[42px] text-[13px] text-center" style={{ color: c.textMuted }}>{s.classAvg.toFixed(1)}</Text>
            <Box className="flex-[2]">
              <Box className="h-1.5 rounded-sm overflow-hidden" style={{ backgroundColor: c.surface }}>
                <Animated.View
                  style={{
                    height: '100%', borderRadius: 3,
                    backgroundColor: s.color,
                    width: barAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${(s.avg / 20) * 100}%`],
                    }) as any,
                  }}
                />
              </Box>
            </Box>
          </Animated.View>
        ))}
      </Box>
    </Box>
  );
}

// ─── Weekly progress (minimal bar chart) ─────────────────

function WeeklyChart({ c }: { c: typeof light }) {
  const DAYS = [
    { d: 'L', h: 2.5 }, { d: 'M', h: 3.0 }, { d: 'Me', h: 1.5 },
    { d: 'J', h: 2.0 }, { d: 'V', h: 3.5 }, { d: 'S', h: 1.0 }, { d: 'D', h: 0.5 },
  ];
  const max = Math.max(...DAYS.map((d) => d.h));
  const barAnims = useRef(DAYS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(50,
      barAnims.map((a) => Animated.timing(a, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      })),
    ).start();
  }, []);

  const total = DAYS.reduce((sum, d) => sum + d.h, 0);

  return (
    <Box className="mb-4">
      <Text className="text-[15px] font-semibold px-6 mb-3" style={{ color: c.text }}>Temps de travail</Text>
      <HStack
        className="mx-5 rounded-xl p-5 items-end"
        style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.borderLight }}
      >
        <HStack className="flex-1 items-end" style={{ gap: 6, height: 100 }}>
          {DAYS.map((d, i) => (
            <Box key={d.d} className="flex-1 items-center">
              <Animated.View
                style={{
                  width: '80%', borderRadius: 4, minHeight: 4,
                  backgroundColor: d.h >= 2 ? c.accent : c.borderLight,
                  height: barAnims[i].interpolate({
                    inputRange: [0, 1], outputRange: [0, (d.h / max) * 80],
                  }) as any,
                }}
              />
              <Text className="text-[11px] font-semibold mt-1.5" style={{ color: c.textMuted }}>{d.d}</Text>
            </Box>
          ))}
        </HStack>
        <Box className="mx-4" style={{ width: 1, height: 60, backgroundColor: c.border }} />
        <Box className="items-center">
          <Text className="text-[32px] font-extrabold" style={{ color: c.text }}>{total}h</Text>
          <Text className="text-[11px] font-medium mt-0.5" style={{ color: c.textMuted }}>cette semaine</Text>
        </Box>
      </HStack>
    </Box>
  );
}

// ─── Deadlines (Notion database list) ────────────────────

function Deadlines({ c }: { c: typeof light }) {
  const ITEMS = [
    { title: 'Controle de Maths', date: 'Ven. 21 mars', tag: 'Examen', tagColor: c.red, tagBg: c.redSoft },
    { title: 'Dissertation Francais', date: 'Lun. 24 mars', tag: 'Devoir', tagColor: c.orange, tagBg: c.orangeSoft },
    { title: 'Expose Histoire', date: 'Mer. 26 mars', tag: 'Projet', tagColor: c.green, tagBg: c.greenSoft },
    { title: 'TP Physique-Chimie', date: 'Jeu. 27 mars', tag: 'Devoir', tagColor: c.orange, tagBg: c.orangeSoft },
  ];

  return (
    <Box className="mb-4">
      <Text className="text-[15px] font-semibold px-6 mb-3" style={{ color: c.text }}>Echeances</Text>
      <Box className="mx-5 rounded-xl overflow-hidden" style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.borderLight }}>
        {ITEMS.map((item, i) => (
          <Pressable
            key={item.title}
            className="flex-row items-center py-3.5 px-4"
            style={{
              gap: 12,
              ...(i < ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: c.borderLight } : {}),
            }}
          >
            <Box
              className="w-[18px] h-[18px] rounded"
              style={{ borderWidth: 1.5, borderColor: c.border }}
            />
            <Box className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: c.text }}>{item.title}</Text>
              <Text className="text-xs mt-0.5" style={{ color: c.textMuted }}>{item.date}</Text>
            </Box>
            <Box className="px-2 py-[3px] rounded-md" style={{ backgroundColor: item.tagBg }}>
              <Text className="text-[11px] font-bold" style={{ color: item.tagColor }}>{item.tag}</Text>
            </Box>
          </Pressable>
        ))}
      </Box>
    </Box>
  );
}

// ─── Main ────────────────────────────────────────────────

export default function LyceeDashboard({ childName, childAvatar }: Props) {
  const [isDark, setIsDark] = useState(false);
  const c = isDark ? dark : light;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <HStack
        className="justify-between items-center px-6 pt-4 pb-4"
        style={{ borderBottomWidth: 1, borderBottomColor: c.border }}
      >
        <Box>
          <Text
            className="text-xs font-medium mb-0.5 uppercase tracking-wide"
            style={{ color: c.textMuted }}
          >
            Tableau de bord
          </Text>
          <Text className="text-[26px] font-extrabold" style={{ color: c.text }}>{childName}</Text>
        </Box>
        <HStack className="items-center" style={{ gap: 12 }}>
          <Pressable
            className="w-9 h-9 rounded-[18px] justify-center items-center"
            style={{ backgroundColor: c.surface }}
            onPress={() => setIsDark(!isDark)}
          >
            <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={c.textSub} />
          </Pressable>
          <Box
            className="w-11 h-11 rounded-[22px] justify-center items-center"
            style={{ borderWidth: 2, borderColor: c.accent, backgroundColor: c.accentSoft }}
          >
            <Text style={{ fontSize: 22 }}>{childAvatar}</Text>
          </Box>
        </HStack>
      </HStack>

      <Box className="pt-1">
        <AriaCoach c={c} />
        <StatsOverview c={c} />
        <SubjectPerformance c={c} />
        <WeeklyChart c={c} />
        <Deadlines c={c} />
      </Box>

      <Box style={{ height: 40 }} />
    </ScrollView>
  );
}
