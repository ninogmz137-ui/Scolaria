/**
 * Météo de Classe — Dashboard de bien-être anonymisé.
 *
 * Affiche la tendance globale du bien-être de la classe, anonymisée (aucun nom d'élève visible).
 * Score de Joie (CLAUDE.md) : météo et tendance en mots uniquement — jamais de chiffre ni de %,
 * jamais de vert/rouge, aucune alerte ni « analyse Aria » en V1 (Aria stade 3, Phase 3).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { FontFamily } from '../../hooks/useSolariaFonts';
import {
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { getClassMeteo } from '../../services/teacherService';
import ScolariaSymbol from '../../components/ScolariaSymbol';

const { width } = Dimensions.get('window');

const TEACHER_ORANGE = '#FF8C42';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Types ───────────────────────────────────────────────

interface DayWeather {
  day: string;
  date: string;
  avgScore: number;
  responses: number;
  alerts: number;
}

interface EmotionDistribution {
  emoji: string;
  label: string;
  percent: number;
  color: string;
}

// ─── Mock data ───────────────────────────────────────────

const CLASS_INFO = {
  name: 'CM2-A',
  school: 'École Voltaire',
  totalStudents: 26,
  respondedToday: 22,
};

const WEEK_DATA: DayWeather[] = [
  { day: 'Lun', date: '16 mars', avgScore: 7.2, responses: 24, alerts: 0 },
  { day: 'Mar', date: '17 mars', avgScore: 6.8, responses: 22, alerts: 1 },
  { day: 'Mer', date: '18 mars', avgScore: 7.5, responses: 20, alerts: 0 },
  { day: 'Jeu', date: '19 mars', avgScore: 6.3, responses: 23, alerts: 2 },
  { day: 'Ven', date: '20 mars', avgScore: 7.1, responses: 22, alerts: 0 },
];

const EMOTION_DISTRIBUTION: EmotionDistribution[] = [
  { emoji: '😄', label: 'Très bien', percent: 42, color: Colors.green },
  { emoji: '🙂', label: 'Bien', percent: 31, color: Colors.cyan },
  { emoji: '😐', label: 'Bof', percent: 18, color: Colors.orange },
  { emoji: '😢', label: 'Difficile', percent: 9, color: Colors.red },
];

// ─── Helpers ─────────────────────────────────────────────

function getWeatherEmoji(score: number): string {
  if (score >= 8) return '☀️';
  if (score >= 6.5) return '⛅';
  if (score >= 5) return '🌥️';
  if (score >= 3) return '🌧️';
  return '⛈️';
}

function getWeatherLabel(score: number): string {
  if (score >= 8) return 'Grand soleil';
  if (score >= 6.5) return 'Éclaircie';
  if (score >= 5) return 'Nuageux';
  if (score >= 3) return 'Pluie';
  return 'Orage';
}

function getWeeklyTrend(data: DayWeather[]): { label: string; icon: string } {
  if (data.length < 2) return { label: 'Stable', icon: 'remove' };
  const diff = data[data.length - 1].avgScore - data[0].avgScore;
  if (diff > 0.3) return { label: 'Plutôt en hausse', icon: 'trending-up' };
  if (diff < -0.3) return { label: 'Plutôt en baisse', icon: 'trending-down' };
  return { label: 'Stable', icon: 'remove' };
}

// ─── Component ───────────────────────────────────────────

export default function MeteoClasseScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(4);
  const [weekData, setWeekData] = useState(WEEK_DATA);
  const [emotionDist, setEmotionDist] = useState(EMOTION_DISTRIBUTION);
  const [classInfo, setClassInfo] = useState(CLASS_INFO);

  // Animations
  const headerScale = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(WEEK_DATA.map(() => new Animated.Value(0))).current;

  const loadMeteo = useCallback(async () => {
    const data = await getClassMeteo(classInfo.name);
    if (data && data.weekData.length > 0) {
      setWeekData(data.weekData);
      setEmotionDist(data.emotionDistribution.map((e, i) => ({
        ...e,
        color: EMOTION_DISTRIBUTION[i]?.color ?? e.color,
      })));
      setClassInfo((prev) => ({
        ...prev,
        totalStudents: data.totalStudents,
        respondedToday: data.respondedToday,
      }));
      setSelectedDay(data.weekData.length - 1);
    }
  }, []);

  useEffect(() => {
    loadMeteo();
    Animated.sequence([
      Animated.spring(headerScale, {
        toValue: 1, tension: 80, friction: 8, useNativeDriver: true,
      }),
      Animated.stagger(100, barAnims.map((a) =>
        Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: false }),
      )),
    ]).start();
  }, []);

  const todayScore = weekData[selectedDay]?.avgScore ?? 0;
  const weeklyTrend = getWeeklyTrend(weekData);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#E8EDF5' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
    >
      {/* ── 1. Header with big weather ── */}
      <LinearGradient
        colors={['#0B1628', TEACHER_ORANGE + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {classInfo.name} — {classInfo.school}
        </Text>

        <Animated.View style={{ alignItems: 'center', marginBottom: 16, transform: [{ scale: headerScale }] }}>
          <Text className="text-[64px] mb-1">{getWeatherEmoji(todayScore)}</Text>
          <Text className="text-base font-semibold mt-0.5" style={{ color: Colors.white }}>{getWeatherLabel(todayScore)}</Text>
        </Animated.View>

        <HStack className="items-center gap-1.5 px-3.5 py-1.5 rounded-[20px]" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Ionicons name="people" size={14} color={Colors.white} />
          <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {classInfo.respondedToday}/{classInfo.totalStudents} élèves ont répondu
          </Text>
        </HStack>
      </LinearGradient>

      <VStack className="px-5 pt-2">
        {/* ── 3. Weekly trend with emoji row ── */}
        <VStack className="mb-6">
          <HStack className="items-center gap-2 mb-3">
            <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
            <Text className="text-base font-bold" style={{ color: Colors.textPrimary }}>Tendance de la semaine</Text>
          </HStack>
          <Box className="rounded-[18px] p-[18px]" style={{ backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.cardBorder, ...CARD_SHADOW }}>
            <HStack className="justify-between mb-4">
              {weekData.map((day, i) => (
                <Pressable
                  key={day.day}
                  onPress={() => setSelectedDay(i)}
                  className="items-center flex-1 py-2.5 rounded-[14px]"
                  style={selectedDay === i ? { backgroundColor: 'rgba(34,211,238,0.1)' } : undefined}
                >
                  <Text className="text-[28px] mb-1">{getWeatherEmoji(day.avgScore)}</Text>
                  <Text className="text-xs mb-0.5" style={{ color: selectedDay === i ? Colors.cyanDark : Colors.textSecondary, fontFamily: selectedDay === i ? FontFamily.displayExtraBold : FontFamily.sansSemiBold }}>
                    {day.day}
                  </Text>
                </Pressable>
              ))}
            </HStack>

            <HStack className="items-center gap-2 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: Colors.cardBorder }}>
              <Ionicons name={weeklyTrend.icon as any} size={20} color={Colors.textSecondary} />
              <Text className="text-[15px] font-extrabold" style={{ color: Colors.textPrimary }}>
                💛 {weeklyTrend.label}
              </Text>
            </HStack>
          </Box>
        </VStack>

        {/* ── Anonymat ── */}
        <HStack className="items-center gap-2 mb-6 px-1">
          <Ionicons name="eye-off" size={14} color={Colors.textMuted} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: Colors.textMuted }}>
            Données agrégées et anonymisées. Le Score de Joie est une tendance, jamais une note : aucun chiffre, aucune alerte.
          </Text>
        </HStack>

        <Box className="h-10" />
      </VStack>
    </ScrollView>
  );
}
