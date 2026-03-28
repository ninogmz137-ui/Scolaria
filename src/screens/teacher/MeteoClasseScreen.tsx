/**
 * Météo de Classe — Dashboard de bien-être anonymisé.
 *
 * Affiche la tendance globale du bien-être de la classe,
 * avec des indicateurs anonymisés (aucun nom d'élève visible).
 */

import { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

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

const WELLBEING_INDICATORS = [
  { label: 'Énergie moyenne', value: 6.8, icon: '⚡', trend: +0.3 },
  { label: 'Stress moyen', value: 3.2, icon: '😰', trend: -0.5 },
  { label: 'Motivation', value: 7.1, icon: '🎯', trend: +0.2 },
  { label: 'Climat social', value: 7.4, icon: '👥', trend: +0.1 },
];

const ANONYMOUS_ALERTS = [
  {
    id: '1',
    level: 'vigilance' as const,
    message: '1 élève montre une baisse de -35% du Score de Joie sur 5 jours',
    date: 'Aujourd\'hui',
  },
  {
    id: '2',
    level: 'attention' as const,
    message: '3 élèves ont un niveau de stress supérieur à 7/10',
    date: 'Hier',
  },
];

const ANXIETY_DATA = {
  current: 12,
  previous: 8,
};

const ARIA_SUMMARY =
  'Semaine stable avec un pic de stress jeudi, probablement lié aux évaluations. Le moral général reste bon. La motivation est en légère hausse depuis lundi.';

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

function getScoreColor(score: number): string {
  if (score >= 7.5) return Colors.green;
  if (score >= 6) return Colors.cyan;
  if (score >= 4) return Colors.orange;
  return Colors.red;
}

function getAnxietyColor(pct: number): string {
  if (pct < 10) return Colors.green;
  if (pct <= 20) return Colors.orange;
  return Colors.red;
}

function getWeeklyTrend(data: DayWeather[]): { label: string; icon: string; color: string } {
  if (data.length < 2) return { label: 'Stable', icon: 'remove', color: Colors.gray };
  const first = data[0].avgScore;
  const last = data[data.length - 1].avgScore;
  const diff = last - first;
  if (diff > 0.3) return { label: 'En hausse', icon: 'trending-up', color: Colors.green };
  if (diff < -0.3) return { label: 'En baisse', icon: 'trending-down', color: Colors.red };
  return { label: 'Stable', icon: 'remove', color: Colors.gray };
}

// ─── Component ───────────────────────────────────────────

export default function MeteoClasseScreen() {
  const [selectedDay, setSelectedDay] = useState(4);

  // Animations
  const headerScale = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(WEEK_DATA.map(() => new Animated.Value(0))).current;
  const distAnims = useRef(EMOTION_DISTRIBUTION.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headerScale, {
        toValue: 1, tension: 80, friction: 8, useNativeDriver: true,
      }),
      Animated.stagger(100, barAnims.map((a) =>
        Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: false }),
      )),
      Animated.stagger(80, distAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: false }),
      )),
    ]).start();
  }, []);

  const todayScore = WEEK_DATA[selectedDay].avgScore;
  const anxietyColor = getAnxietyColor(ANXIETY_DATA.current);
  const weeklyTrend = getWeeklyTrend(WEEK_DATA);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.blueNight }} showsVerticalScrollIndicator={false}>
      {/* ── 1. Header with big weather ── */}
      <LinearGradient
        colors={[Colors.cyanDark, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
        style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 24 }}
      >
        <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {CLASS_INFO.name} — {CLASS_INFO.school}
        </Text>

        <Animated.View style={{ alignItems: 'center', marginBottom: 16, transform: [{ scale: headerScale }] }}>
          <Text className="text-[64px] mb-1">{getWeatherEmoji(todayScore)}</Text>
          <Text className="text-[42px] font-black" style={{ color: Colors.white }}>{todayScore.toFixed(1)}</Text>
          <Text className="text-base font-semibold mt-0.5" style={{ color: Colors.cyan }}>{getWeatherLabel(todayScore)}</Text>
        </Animated.View>

        <HStack className="items-center gap-1.5 px-3.5 py-1.5 rounded-[20px]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <Ionicons name="people" size={14} color={Colors.cyan} />
          <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {CLASS_INFO.respondedToday}/{CLASS_INFO.totalStudents} élèves ont répondu
          </Text>
        </HStack>
      </LinearGradient>

      <VStack className="px-5 pt-2">
        {/* ── 2. Anxiety percentage card ── */}
        <VStack className="mb-6">
          <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Pourcentage d'anxiété</Text>
          <Box className="rounded-[18px] p-5" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: anxietyColor + '40' }}>
            <HStack className="justify-between items-center">
              <VStack className="flex-1">
                <Text className="text-5xl font-black" style={{ color: anxietyColor, letterSpacing: -1 }}>
                  {ANXIETY_DATA.current}%
                </Text>
                <Text className="text-[13px] mt-0.5" style={{ color: Colors.gray }}>des élèves cette semaine</Text>
              </VStack>
              <HStack className="items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Box className="w-2 h-2 rounded-full" style={{ backgroundColor: anxietyColor }} />
                <Text className="text-[13px] font-bold" style={{ color: anxietyColor }}>
                  {ANXIETY_DATA.current < 10
                    ? 'Faible'
                    : ANXIETY_DATA.current <= 20
                      ? 'Modéré'
                      : 'Élevé'}
                </Text>
              </HStack>
            </HStack>
            <HStack className="items-center gap-1 mt-3.5 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <Ionicons
                name={ANXIETY_DATA.current > ANXIETY_DATA.previous ? 'arrow-up' : 'arrow-down'}
                size={13}
                color={ANXIETY_DATA.current > ANXIETY_DATA.previous ? Colors.red : Colors.green}
              />
              <Text className="text-[13px]" style={{ color: Colors.gray }}>
                vs {ANXIETY_DATA.previous}% la semaine dernière
              </Text>
            </HStack>
          </Box>
        </VStack>

        {/* ── 3. Weekly trend with emoji row ── */}
        <VStack className="mb-6">
          <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Tendance de la semaine</Text>
          <Box className="rounded-[18px] p-[18px]" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <HStack className="justify-between mb-4">
              {WEEK_DATA.map((day, i) => (
                <Pressable
                  key={day.day}
                  onPress={() => setSelectedDay(i)}
                  className="items-center flex-1 py-2.5 rounded-[14px]"
                  style={selectedDay === i ? { backgroundColor: 'rgba(34,211,238,0.1)' } : undefined}
                >
                  <Text className="text-[28px] mb-1">{getWeatherEmoji(day.avgScore)}</Text>
                  <Text className="text-xs mb-0.5" style={{ color: selectedDay === i ? Colors.cyan : Colors.gray, fontWeight: selectedDay === i ? '800' : '600' }}>
                    {day.day}
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: selectedDay === i ? Colors.white : Colors.gray }}>
                    {day.avgScore.toFixed(1)}
                  </Text>
                </Pressable>
              ))}
            </HStack>

            <HStack className="items-center gap-2 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <Ionicons name={weeklyTrend.icon as any} size={20} color={weeklyTrend.color} />
              <Text className="text-[15px] font-extrabold" style={{ color: weeklyTrend.color }}>
                {weeklyTrend.label}
              </Text>
              <Text className="text-[13px] ml-auto" style={{ color: Colors.gray }}>
                {WEEK_DATA[0].avgScore.toFixed(1)} → {WEEK_DATA[WEEK_DATA.length - 1].avgScore.toFixed(1)}
              </Text>
            </HStack>
          </Box>
        </VStack>

        {/* ── 4. Aria summary card ── */}
        <VStack className="mb-6">
          <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Résumé Aria</Text>
          <Box className="rounded-[18px] p-[18px]" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: Colors.violet + '30' }}>
            <HStack className="items-center gap-2.5 mb-3">
              <LinearGradient
                colors={[Colors.violet, Colors.cyanDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="sparkles" size={16} color={Colors.white} />
              </LinearGradient>
              <Text className="text-sm font-bold" style={{ color: Colors.violet + 'CC' }}>Analyse IA de la semaine</Text>
            </HStack>
            <Text className="text-sm leading-[21px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{ARIA_SUMMARY}</Text>
          </Box>
        </VStack>

        {/* ── 5. Emotion distribution ── */}
        <VStack className="mb-6">
          <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Répartition des émotions</Text>
          <Box className="rounded-[18px] p-[18px]" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <HStack className="h-3.5 rounded-[7px] overflow-hidden mb-4 gap-0.5">
              {EMOTION_DISTRIBUTION.map((e, i) => (
                <Animated.View
                  key={e.label}
                  style={{
                    flex: distAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, e.percent],
                    }),
                    backgroundColor: e.color,
                    borderRadius: 7,
                  }}
                />
              ))}
            </HStack>

            <HStack className="justify-between">
              {EMOTION_DISTRIBUTION.map((e) => (
                <VStack key={e.label} className="items-center flex-1">
                  <Text className="text-2xl mb-1">{e.emoji}</Text>
                  <Text className="text-base font-extrabold" style={{ color: Colors.white }}>{e.percent}%</Text>
                  <Text className="text-[10px] mt-0.5" style={{ color: Colors.gray }}>{e.label}</Text>
                </VStack>
              ))}
            </HStack>
          </Box>
        </VStack>

        {/* ── 6. Wellbeing indicators ── */}
        <VStack className="mb-6">
          <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Indicateurs de bien-être</Text>
          <HStack className="flex-wrap gap-2.5">
            {WELLBEING_INDICATORS.map((ind) => (
              <VStack
                key={ind.label}
                className="items-center p-4 rounded-2xl"
                style={{
                  width: (width - 50) / 2,
                  backgroundColor: Colors.blueNightCard,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text className="text-2xl mb-1.5">{ind.icon}</Text>
                <Text className="text-2xl font-black" style={{ color: getScoreColor(ind.label.includes('Stress') ? 10 - ind.value : ind.value) }}>
                  {ind.value.toFixed(1)}
                </Text>
                <Text className="text-[11px] mt-0.5 text-center" style={{ color: Colors.gray }}>{ind.label}</Text>
                <HStack className="items-center gap-0.5 mt-1.5 px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <Ionicons
                    name={ind.trend >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={
                      ind.label.includes('Stress')
                        ? (ind.trend <= 0 ? Colors.green : Colors.red)
                        : (ind.trend >= 0 ? Colors.green : Colors.red)
                    }
                  />
                  <Text className="text-[11px] font-bold" style={{
                    color: ind.label.includes('Stress')
                      ? (ind.trend <= 0 ? Colors.green : Colors.red)
                      : (ind.trend >= 0 ? Colors.green : Colors.red),
                  }}>
                    {ind.trend >= 0 ? '+' : ''}{ind.trend.toFixed(1)}
                  </Text>
                </HStack>
              </VStack>
            ))}
          </HStack>
        </VStack>

        {/* ── 7. Anonymous alerts ── */}
        {ANONYMOUS_ALERTS.length > 0 && (
          <VStack className="mb-6">
            <Text className="text-base font-bold mb-3" style={{ color: Colors.white }}>Signalements anonymes</Text>
            {ANONYMOUS_ALERTS.map((alert) => (
              <Box
                key={alert.id}
                className="rounded-[14px] p-3.5 mb-2"
                style={{
                  borderWidth: 1,
                  borderColor: alert.level === 'vigilance' ? Colors.orange + '40' : Colors.red + '40',
                  backgroundColor: alert.level === 'vigilance' ? '#3D2E10' : '#3D1010',
                }}
              >
                <HStack className="justify-between items-center mb-2">
                  <HStack className="items-center gap-1 px-2 py-[3px] rounded-lg" style={{ backgroundColor: (alert.level === 'vigilance' ? Colors.orange : Colors.red) + '20' }}>
                    <Ionicons
                      name={alert.level === 'vigilance' ? 'warning' : 'alert'}
                      size={14}
                      color={alert.level === 'vigilance' ? Colors.orange : Colors.red}
                    />
                    <Text className="text-xs font-bold uppercase" style={{ color: alert.level === 'vigilance' ? Colors.orange : Colors.red }}>
                      {alert.level === 'vigilance' ? 'Vigilance' : 'Attention'}
                    </Text>
                  </HStack>
                  <Text className="text-[11px]" style={{ color: Colors.gray }}>{alert.date}</Text>
                </HStack>
                <Text className="text-[13px] leading-[19px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{alert.message}</Text>
              </Box>
            ))}

            {/* ── 8. Anonymity disclaimer ── */}
            <HStack className="items-center gap-2 mt-2 px-1">
              <Ionicons name="eye-off" size={14} color={Colors.gray} />
              <Text className="flex-1 text-[11px] leading-4" style={{ color: Colors.gray }}>
                Les données sont agrégées et anonymisées. Aucun nom d'élève n'est visible.
              </Text>
            </HStack>
          </VStack>
        )}

        <Box className="h-10" />
      </VStack>
    </ScrollView>
  );
}
